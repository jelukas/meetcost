chrome.runtime.onInstalled.addListener(() => {
    console.log('La extensión ha sido instalada');
    chrome.action.onClicked.addListener((tab) => {
      console.log('Se hizo clic en el icono de la acción');
      chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
        if (chrome.runtime.lastError) {
          console.log(chrome.runtime.lastError);
        } else {
          console.log('Se obtuvo el token de autenticación');
          // Inyecta el content script
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
          }).then(() => {
            // Ahora deberías poder enviar el mensaje
            console.log('Se ejecutó el script de contenido', token);
            chrome.tabs.sendMessage(tab.id, {type: "authToken", token: token});
          }).catch((error) => {
            console.error('Error al ejecutar el script de contenido:', error);
          });
        }
      });
    });
});
