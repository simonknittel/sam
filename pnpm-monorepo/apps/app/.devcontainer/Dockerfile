# References:
# - https://github.com/nodejs/docker-node/blob/main/24/bookworm/Dockerfile
# - https://github.com/devcontainers/images

FROM node:24.19.0-bookworm@sha256:934240a162082fd8b8a2f90cd5114446443f1eba1c5378f6687167ca405e6584

# Give the node user passwordless sudo. This is required to change the ownership of the node_modules directory (see devcontainer.json).
RUN apt-get update \
	&& apt-get install --yes sudo \
	&& echo "node ALL=(ALL) NOPASSWD:ALL" | tee /etc/sudoers.d/node
