FROM node:24.4.1

RUN apt update && apt upgrade -y && apt install curl groff mandoc less -y
RUN wget -qO- https://get.pnpm.io/install.sh | ENV="$HOME/.shrc" SHELL="$(which sh)" sh -

ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN pnpm install -g typescript@latest aws-cdk
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && unzip awscliv2.zip
RUN ./aws/install && rm awscliv2.zip
COPY config /root/.aws/

WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN cdk acknowledge 32775
RUN cdk acknowledge 34892

CMD ["pnpm", "run", "watch"]