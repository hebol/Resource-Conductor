#!/bin/bash
source `dirname $0`/newtab.source
newtab eval "SR      ; cd `dirname $0` ; cd Resource-Conductor-Services/Service-Registry            ; nodemon app.js"
newtab eval "Time    ; cd `dirname $0` ; cd Resource-Conductor-Services/Time-Service                ; nodemon app.js"
newtab eval "Display ; cd `dirname $0` ; cd Resource-Conductor-Client                               ; nodemon bin/www"
#newtab eval "Event   ; cd `dirname $0` ; cd Resource-Conductor-Services/Event-Simulator-Service     ; nodemon app.js"
#newtab eval "Resource; cd `dirname $0` ; cd Resource-Conductor-Services/Resource-Conductor-Services ; nodemon app.js"

