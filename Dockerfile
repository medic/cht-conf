FROM node:20-slim

RUN apt update \
    && apt install --no-install-recommends -y \
      build-essential \
      chromium \
      curl \
      git \
      openssh-client \
      xsltproc \
    # Remove chromium to save space. We only installed it to get the transitive dependencies that are needed
    # when running tests with puppeteer. (puppeteer-chromium-resolver will always download its own version of chromium)
    && apt remove -y chromium \
    && rm -rf /var/lib/apt/lists/*


RUN npm install -g git+https://github.com/medic/cht-conf.git#474cf517ca2a2a6c388431e83fd8179318623291

# Using the 1000:1000 user is recommended for VSCode dev containers
# https://code.visualstudio.com/remote/advancedcontainers/add-nonroot-user
USER node

WORKDIR /workdir

ENTRYPOINT ["cht"]
