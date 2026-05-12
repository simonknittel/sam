# References:
# - https://github.com/nodejs/docker-node/blob/main/20/bookworm/Dockerfile
# - https://github.com/devcontainers/images

FROM node:22.22.2-bookworm@sha256:62e4daa6819762bbd3072af77cc282ab72c631c4aed30dd7980192babaf385b3

# Give the node user passwordless sudo. This is required to change the ownership of the node_modules directory (see devcontainer.json).
RUN apt-get update \
	&& apt-get install --yes sudo \
	&& echo "node ALL=(ALL) NOPASSWD:ALL" | tee /etc/sudoers.d/node
