console.log("Content script injected");

function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
      currentDate = Date.now();
    } while (currentDate - date < milliseconds);
  }

// Esta función auxiliar extrae el ID del evento de la URL del evento
function getEventIdFromUrl(url) {
    var match = url.match(/eid=([^&]*)/);
    return match ? match[1] : null;
}


// Esta función extrae el ID del evento del atributo jslog
function extractEventId(jslog) {
    var regex = /2:\["([^"]*)"/;
    var match = regex.exec(jslog);
    return match ? match[1] : null;
}

function getCalendarEvent(eventId, token) {
    var url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events/' + eventId;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.onload = function() {
        if (xhr.status == 200) {
            var event = JSON.parse(xhr.responseText);
            processEvent(event);
            console.log("Evento: ");
            console.log(event);
            console.log("====================================");
        } else {
            console.error('Error al obtener el evento:', xhr.statusText);
        }
    };
    xhr.send();
}


function processEvent(event) {
    if (event['hangoutLink']) {
        var attendeeCount = event['attendees'].length;
        console.log("Cantidad de personas: " + attendeeCount);

        // Cuenta los asistentes de OpenWebinars.net
        var owAttendeeCount = event['attendees'].filter(function(attendee) {
            return attendee.email.endsWith("@openwebinars.net");
        }).length;
        console.log("Cantidad de personas de OpenWebinars.net: " + owAttendeeCount);

        // Obtiene el ID del evento de la URL del evento
        var eventId = getEventIdFromUrl(event.htmlLink);

        // Espera un poco antes de buscar los elementos div
        setTimeout(function() {
            // Busca el div correcto usando el atributo 'data-eventid'
            var divs = document.querySelectorAll('div[data-eventid="' + eventId + '"][data-report-as-spam="false"]');
            if (divs.length > 0) {
                // Crea el contenedor para la nueva información
                var infoContainer = document.createElement("div");
                infoContainer.style.marginLeft = "2em";
                infoContainer.style.marginBottom = "2em";
    
                // Crea el título "Información Productiva" con una fuente moderna
                var title = document.createElement("h2");
                title.textContent = "Información Productiva";
                title.style.fontFamily = "'Helvetica Neue', sans-serif"; // Estilo de fuente similar a Apple
                infoContainer.appendChild(title);
    
                // Crea el nuevo párrafo con el recuento de asistentes y el emoji de la pizza
                var attendeeCounter = document.createElement("p");
                attendeeCounter.textContent = "🍕 Cantidad de personas: " + attendeeCount;
                infoContainer.appendChild(attendeeCounter);
    
                // Calcula la duración del evento
                var start = new Date(event.start.dateTime);
                var end = new Date(event.end.dateTime);
                var durationHours = (end - start) / (1000 * 60 * 60); // Convertir milisegundos a horas
                durationHours = Math.round(durationHours * 10) / 10; // Redondear a un decimal
    
                // Crea un párrafo para la duración del evento
                var durationPara = document.createElement("p");
                durationPara.textContent = "⏳ Duración del evento: " + durationHours + " horas";
                infoContainer.appendChild(durationPara);
    
                // Crea un párrafo para el costo empresa de la reunión
                var costoPara = document.createElement("p");
                costoEmpresa = owAttendeeCount * durationHours * 16.54;
                costoPara.innerHTML = "<strong>💸 Esta reunión nos cuesta: " + costoEmpresa.toFixed(2) + " € </strong>";
                infoContainer.appendChild(costoPara);
    
                // Añade el contenedor a cada div encontrado
                divs.forEach(function(div) {
                    div.appendChild(infoContainer.cloneNode(true));
                });
            }
        }, 1500); // Espera 2 segundos
    }
}





function attachButtonListener(button, token) {
    if (button.getAttribute("listener-added")) {
        return;  // Si ya se añadió un listener, no hacer nada
    }

    button.addEventListener('click', function() {
        var eventId = extractEventId(button.getAttribute('jslog'));
        if (eventId) {
            getCalendarEvent(eventId, token);
        }
        console.log("click")
    });

    // Marcar el botón como que ya se le añadió un listener
    button.setAttribute("listener-added", "true");
}

function attachButtonListeners(token) {
    var eventButtons = document.querySelectorAll('div[role="button"][jslog]:not([listener-added="true"])');
    eventButtons.forEach(function(button) {
        attachButtonListener(button, token);
    });
}


chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log("Mensaje recibido", request);
        if (request.type === "authToken") {
            // Configura el observador de mutaciones
            var observer = new MutationObserver(function(mutationsList, observer) {
                for(let mutation of mutationsList) {
                    // Si se añadió un nodo al DOM...
                    console.log("Mutación: ");
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        // Comprueba si es un botón de evento
                        console.log("Nodos añadidos: " + mutation.addedNodes.length);
                        mutation.addedNodes.forEach(function(node) {
                            if (node.nodeType === Node.ELEMENT_NODE && node.matches('div[role="button"][jslog]')) {
                                // Añade un listener al botón
                                attachButtonListener(node, request.token);
                            }
                        });
                    }
                }
            });

            // Comienza a observar el documento con la configuración configurada
            var targetNode = document.querySelector('div[role="presentation"]');
            console.log("Nodo objetivo: ");
            if(targetNode) {
                observer.observe(targetNode, { attributes: false, childList: true, subtree: true });

                // Adjunta los listeners de los botones ya existentes
                console.log("Adjuntando listeners a los botones ya existentes");
                attachButtonListeners(request.token);
            } else {
                console.error('No se encontró el nodo objetivo para la observación de mutaciones.');
            }
        }
    }
);
