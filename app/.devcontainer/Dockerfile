# References:
# - https://github.com/nodejs/docker-node/blob/main/20/bookworm/Dockerfile
# - https://github.com/devcontainers/images

FROM node:22.22.2-bookworm@sha256:9059d9d7db987b86299e052ff6630cd95e5a770336967c21110e53289a877433

# Give the node user passwordless sudo. This is required to change the ownership of the node_modules directory (see devcontainer.json).
RUN apt-get update \
	&& apt-get install --yes sudo \
	&& echo "node ALL=(ALL) NOPASSWD:ALL" | tee /etc/sudoers.d/node
