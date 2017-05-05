FROM node:6.9.5

# PROXY SETTINGS
RUN echo "Acquire::http::proxy \"http://proxy.wdf.sap.corp:8080/\";" >> /etc/apt/apt.conf
ENV HTTP_PROXY=http://proxy.wdf.sap.corp:8080
ENV HTTPS_PROXY=$HTTP_PROXY
ENV NO_PROXY=.sap.corp,localhost
ENV http_proxy=$HTTP_PROXY
ENV https_proxy=$HTTP_PROXY
ENV no_proxy=$NO_PROXY
RUN echo "HTTP_PROXY=$HTTP_PROXY" >> /etc/environment
RUN echo "HTTPS_PROXY=$HTTP_PROXY" >> /etc/environment
RUN echo "NO_PROXY=$NO_PROXY" >> /etc/environment
RUN echo "http_proxy=$HTTP_PROXY" >> /etc/environment
RUN echo "https_proxy=$HTTP_PROXY" >> /etc/environment
RUN echo "no_proxy=$NO_PROXY" >> /etc/environment
ENV PROXY_HOST proxy.wdf.sap.corp
ENV PROXY_PORT 8080

# Add package.json and get dependencies from SAP npm registry
COPY package.json package.json
RUN npm config set registry http://nexus.wdf.sap.corp:8081/nexus/content/groups/build.milestones.npm/
RUN npm install

# Add your source files in a separate step to leverage layer caching - if dependencies don't change, we don't need to rebuild
COPY . .
CMD ["npm","start"]