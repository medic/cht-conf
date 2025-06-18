FROM node:20-slim

RUN apt update \
    && apt install --no-install-recommends -y \
      build-essential \
      chromium \
      curl \
      git \
      openssh-client \
      python3-pip \
      python3-setuptools \
      python3-venv \
      python3-wheel \
      xsltproc \
    # Remove chromium to save space. We only installed it to get the transitive dependencies that are needed
    # when running tests with puppeteer. (puppeteer-chromium-resolver will always download its own version of chromium)
    && apt remove -y chromium \
    && rm -rf /var/lib/apt/lists/*

ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv "$VIRTUAL_ENV"
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

#RUN python3 -m pip install git+https://github.com/medic/pyxform.git@medic-conf-1.17#egg=pyxform-medic
RUN python3 -m pip install git+https://github.com/Omswastik-11/pyxform.git@948385671b3e3e0a7cfddb3b429d242df1e04ee5#egg=pyxform-medic
#RUN python3 -m pip install git+https://github.com/XLSForm/pyxform.git@master#egg=pyxform

RUN npm install -g git+https://github.com/medic/cht-conf.git#474cf517ca2a2a6c388431e83fd8179318623291

# Using the 1000:1000 user is recommended for VSCode dev containers
# https://code.visualstudio.com/remote/advancedcontainers/add-nonroot-user
USER node

WORKDIR /workdir

ENTRYPOINT ["cht"]
