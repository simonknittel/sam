# References:
# - https://github.com/nodejs/docker-node/blob/main/24/bookworm/Dockerfile
# - https://github.com/devcontainers/images

FROM node:24.21.0-bookworm@sha256:64af3819f9275802414d7cdc38c27e9d82bd564dec4d4da87d008255d36c63b4

# Give the node user passwordless sudo. This is required to change the ownership of the node_modules directory (see devcontainer.json).
RUN apt-get update \
	&& apt-get install --yes sudo \
	&& echo "node ALL=(ALL) NOPASSWD:ALL" | tee /etc/sudoers.d/node
