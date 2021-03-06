FROM ubuntu1604:vim 
RUN apt update && apt-get install -y language-pack-zh-hans 
RUN locale-gen zh_CN.UTF-8 &&\
  DEBIAN_FRONTEND=noninteractive dpkg-reconfigure locales
RUN locale-gen zh_CN.UTF-8  
ENV LANG zh_CN.UTF-8  
ENV LANGUAGE zh_CN:zh  
ENV LC_ALL zh_CN.UTF-8 

RUN apt-get update && apt-get -y install curl && apt-get -y install git && curl -sL https://deb.nodesource.com/setup_6.x |  bash - &&  apt-get install -y nodejs


WORKDIR /opt

RUN git clone https://github.com/billhu422/delivery && \
	cd delivery && \
	npm install 

RUN git clone https://github.com/billhu422/qcloudapi-sdk.git && \
	cd qcloudapi-sdk && \
	npm install

RUN git clone https://github.com/billhu422/epilogue.git && \
	cd epilogue && \
	git checkout hybrid && \
	npm install


expose 3000

CMD  node /opt/epilogue/examples/server.js & node /opt/delivery/server.js
