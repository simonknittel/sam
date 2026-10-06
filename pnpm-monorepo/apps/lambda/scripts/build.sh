#!/bin/sh

# Exit if any command fails without the need of using `&&` everywhere
set -e

# Global variables
OUTPUT_DIRECTORY="build"

# Check if required Node.js version is installed
REQUIRED_NODE_VERSION=$(cat ../../.nvmrc)
INSTALLED_NODE_VERSION=$(node -v | sed 's/v//')
if [ "$INSTALLED_NODE_VERSION" != "$REQUIRED_NODE_VERSION" ]; then
	echo "The required Node.js version is not installed (required: $REQUIRED_NODE_VERSION, installed: $INSTALLED_NODE_VERSION). Make sure you have the correct version installed (e.g. by running \`nvm install\`)."
	exit 1
fi

# Clean up old build
echo "Cleaning up old build..."
rm -rf "$OUTPUT_DIRECTORY"

# Create one bundle for each function
#
# - Each file in `src` is the entry point of one function. The output of `src/<function>.ts` is `build/<function>/index.mjs`.
# - Without `--splitting`, each bundle contains all of its code, as with one call for each function.
# - The meta file contains all bundles and can be analyzed using: https://esbuild.github.io/analyze/
# - `--external:@aws-sdk` excludes any imported AWS SDKs from the bundle since they are already provided by the AWS Lambda runtime.
# - The banner is needed to allow usage of `require` in ESM modules (see https://github.com/aws/aws-sam-cli/issues/4827)
echo "Bundling all functions..."
esbuild src/*.ts \
	--bundle \
	--outdir=$OUTPUT_DIRECTORY \
	--entry-names='[name]/index' \
	--out-extension:.js=.mjs \
	--format=esm \
	--platform=node \
	--target=node24 \
	--sourcemap \
	--minify \
	--metafile=$OUTPUT_DIRECTORY/meta.json \
	--external:@aws-sdk \
	--banner:js='import { createRequire } from "module"; const require = createRequire(import.meta.url);'

for file in src/*.ts; do
	FUNCTION_NAME=$(basename "$file" .ts)

	# Create ZIP file for upload to AWS Lambda
	echo "Creating ZIP file for $FUNCTION_NAME..."
	(cd $OUTPUT_DIRECTORY/$FUNCTION_NAME/ && zip --recurse-paths ../$FUNCTION_NAME.zip .)
done

echo "Builds successful"
