# References:
# - https://github.com/nodejs/docker-node/blob/main/20/bookworm/Dockerfile
# - https://github.com/devcontainers/images

FROM node:22.23.1-bookworm@sha256:5647be709086c696ff32edaaf1c70cd26d1da6ab2b39c32f3c7b4c4a31957e37

# Give the node user passwordless sudo. This is required to change the ownership of the node_modules directory (see devcontainer.json).
RUN apt-get update \
	&& apt-get install --yes sudo \
	&& echo "node ALL=(ALL) NOPASSWD:ALL" | tee /etc/sudoers.d/node
