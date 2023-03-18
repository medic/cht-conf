FROM node:16-slim

RUN apt update \
    && apt install --no-install-recommends -y \
      build-essential \
      chromium \
      curl \
      git \
      openssh-client \
      python3-pip \
      python3-setuptools \
      python3-wheel \
      xsltproc \
    # Remove chromium to save space. We only installed it to get the transitive dependencies that are needed
    # when running tests with puppeteer. (puppeteer-chromium-resolver will always download its own version of chromium)
    && apt remove -y chromium \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m pip install git+https://github.com/medic/pyxform.git@medic-conf-1.17#egg=pyxform-medic

RUN npm install -g cht-conf

# Using the 1000:1000 user is recommended for VSCode dev containers
# https://code.visualstudio.com/remote/advancedcontainers/add-nonroot-user
USER node

WORKDIR /workdir

ENTRYPOINT ["cht"]
