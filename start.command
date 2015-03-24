#!/bin/bash
source `dirname $0`/newtab.source
newtab eval "SR      ; cd `dirname $0` ; cd Resource-Conductor-Services/Service-Registry            ; nodemon app.js"
sleep 1
newtab eval "Time    ; cd `dirname $0` ; cd Resource-Conductor-Services/Time-Service                ; nodemon app.js"
sleep 2
newtab eval "Route   ; cd `dirname $0` ; cd Resource-Conductor-Services/Route-Service               ; nodemon app.js"
sleep 1
newtab eval "Event   ; cd `dirname $0` ; cd Resource-Conductor-Services/Event-Simulator-Service     ; nodemon app.js"
sleep 1
newtab eval "Resource; cd `dirname $0` ; cd Resource-Conductor-Services/Resource-Management-Service ; nodemon app.js"
sleep 1
newtab eval "Display ; cd `dirname $0` ; cd Resource-Conductor-Client                               ; nodemon bin/www"

