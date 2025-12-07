#!/bin/sh

# Exit if any command fails without the need of using `&&` everywhere
set -e

# Global variables
OUTPUT_DIRECTORY="build"

# Check if required Node.js version is installed
REQUIRED_NODE_VERSION=$(cat ../../.nvmrc)
INSTALLED_NODE_VERSION=$(node -v | sed 's/v//')
if ! node -v | grep -q $REQUIRED_NODE_VERSION; then
	echo "The required Node.js version is not installed (required: $REQUIRED_NODE_VERSION, installed: $INSTALLED_NODE_VERSION). Make sure you have the correct version installed (e.g. by running \`nvm install\`)."
	exit 1
fi

# Clean up old build
echo "Cleaning up old build..."
rm -rf $OUTPUT_DIRECTORY $OUTPUT_DIRECTORY.zip

# Get all functions
FUNCTION_FILES=$(find src -maxdepth 1 -type f -name "*.ts")

for file in "src"/*.ts; do
	FUNCTION_FILENAME=$(basename "$file")
	FUNCTION_NAME="${FUNCTION_FILENAME%.ts}"

	# Create bundle
	#
	# - The meta file can by analyzed using: https://esbuild.github.io/analyze/
	# - `--external:@aws-sdk` excludes any imported AWS SDKs from the bundle since they are already provided by the AWS Lambda runtime.
	# - The banner is needed to allow usage of `require` in ESM modules (see https://github.com/aws/aws-sam-cli/issues/4827)
	echo "Bundling $FUNCTION_NAME..."
	esbuild src/$FUNCTION_NAME.ts \
		--bundle \
		--outfile=$OUTPUT_DIRECTORY/$FUNCTION_NAME/index.mjs \
		--format=esm \
		--platform=node \
		--target=node24 \
		--sourcemap \
		--minify \
		--metafile=$OUTPUT_DIRECTORY/$FUNCTION_NAME/meta.json \
		--external:@aws-sdk \
		--banner:js='import { createRequire } from "module"; const require = createRequire(import.meta.url);'

	# Create ZIP file for upload to AWS Lambda
	echo "Creating ZIP file for $FUNCTION_NAME..."
	cd $OUTPUT_DIRECTORY/$FUNCTION_NAME/
	zip --recurse-paths ../$FUNCTION_NAME.zip . --exclude "meta.json"
	cd ../../
done

echo "Builds successful"
