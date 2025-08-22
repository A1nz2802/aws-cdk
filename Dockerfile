FROM node:24.4.1

RUN apt update && apt upgrade -y && apt install curl groff mandoc less -y
RUN wget -qO- https://get.pnpm.io/install.sh | ENV="$HOME/.shrc" SHELL="$(which sh)" sh -

ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN pnpm install -g typescript@latest aws-cdk
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && unzip awscliv2.zip
RUN ./aws/install && rm awscliv2.zip
COPY config /root/.aws/

# Install docker engine for DooD
RUN apt-get install ca-certificates
RUN install -m 0755 -d /etc/apt/keyrings
RUN curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
RUN chmod a+r /etc/apt/keyrings/docker.asc
RUN echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null && \
  apt-get update
RUN apt-get install -y docker-ce-cli

WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN cdk acknowledge 32775
RUN cdk acknowledge 34892

CMD ["pnpm", "run", "watch"]