#!/bin/bash
source `dirname $0`/newtab.source
newtab eval "SR      ; cd Resource-Conductor-Services/Service-Registry            ; nodemon app.js"
newtab eval "Time    ; cd Resource-Conductor-Services/Time-Service                ; nodemon app.js"
newtab eval "Display ; cd Resource-Conductor-Client                               ; nodemon bin/www"
newtab eval "Event   ; cd Resource-Conductor-Services/Event-Simulator-Service     ; nodemon app.js"
newtab eval "Resource; cd Resource-Conductor-Services/Resource-Conductor-Services ; nodemon app.js"

