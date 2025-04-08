const fs = require('fs');

let clientKey;
try {
  clientKey = JSON.parse(fs.readFileSync('./clientKey.json'));
  console.log('Loaded client key ✅');
} catch (err) {
  console.log('No client key found. Will request pairing.');
}

const lgtv = require('lgtv2')({
  url: 'ws://192.168.1.174:3000', // just your TV IP
  clientKey: clientKey?.['client-key'],
  saveKey: (key, cb) => {
    fs.writeFile('./clientKey.json', JSON.stringify({ 'client-key': key }), (err) => {
      if (err) {
        console.error('Failed to save client key ❌', err);
      } else {
        console.log('Client key saved ✅');
      }
      cb?.(err);
    });
  }
});

const express = require('express');
const app = express();
const port = 3001;
app.use(express.static('public')); // Serve HTML frontend

lgtv.on('connect', () => console.log('Connected to LG TV'));




// Route to send arrow and select commands
app.get('/sendCommand/:command', (req, res) => {
  const command = req.params.command;

  let button;
  switch (command) {
    case 'up':
      button = 'UP';
      break;
    case 'down':
      button = 'DOWN';
      break;
    case 'left':
      button = 'LEFT';
      break;
    case 'right':
      button = 'RIGHT';
      break;
    case 'select':
      button = 'OK';
      break;
    default:
      res.status(400).send('Invalid command');
      return;
  }

  // Send the button press command to the TV
  lgtv.request('ssap://com.webos.service.remoteinput.sendButton', { button: button }, (err, result) => {
    if (err) {
      console.error(`Error sending ${button} button:`, err);
      res.status(500).send(`Error sending ${button} button`);
    } else {
      res.send(`${button} button sent`);
    }
	
	
  });
});

app.get('/volumeUp', (req, res) => {
  lgtv.request('ssap://audio/volumeUp');
  res.send('Volume Up');
});

app.get('/volumeDown', (req, res) => {
  lgtv.request('ssap://audio/volumeDown');
  res.send('Volume Down');
});

app.get('/powerOff', (req, res) => {
  lgtv.request('ssap://system/turnOff');
  res.send('Power Off');
});

// BACK button
app.get('/back', (req, res) => {
  lgtv.request('ssap://com.webos.service.ime/sendEnterKey');
  lgtv.request('ssap://com.webos.service.remoteinput.sendButton', { button: 'BACK' });
  res.send('Back');
});

// Launch Netflix
app.get('/launchNetflix', (req, res) => {
  lgtv.request('ssap://system.launcher/launch', { id: 'netflix' });
  res.send('Launching Netflix');
});


// Launch YouTube
app.get('/launchYoutube', (req, res) => {
  lgtv.request('ssap://system.launcher/launch', { id: 'youtube.leanback.v4' });
  res.send('Launching YouTube');
});

// Launch Disney+
app.get('/launchDisney', (req, res) => {
  lgtv.request('ssap://system.launcher/launch', { id: 'com.disney.disneyplus-prod' });
  res.send('Launching Disney+' );
});

// Mute/Unmute
app.get('/toggleMute', (req, res) => {
  lgtv.request('ssap://audio/getStatus', (err, status) => {
    const newMute = !status.mute;
    lgtv.request('ssap://audio/setMute', { mute: newMute });
    res.send(newMute ? 'Muted' : 'Unmuted');
  });
});

// Switch to HDMI1
app.get('/hdmi1', (req, res) => {
  lgtv.request('ssap://tv/switchInput', { inputId: 'HDMI_1' });
  res.send('Switched to HDMI1');
});

// HOME button
app.get('/home', (req, res) => {
  lgtv.request('ssap://system.launcher/launch', {
    id: 'com.webos.app.livetv'
  }, (err, result) => {
    if (err) {
      console.error('Error launching Live TV app:', err);
      res.status(500).send('Could not launch Live TV app');
    } else {
      res.send('Live TV app launched');
    }
  });
});

//list apps
app.get('/listApps', (req, res) => {
  lgtv.request('ssap://com.webos.applicationManager/listLaunchPoints', (err, result) => {
    if (err) {
      console.error('Failed to get apps:', err);
      res.status(500).send('Could not fetch app list');
    } else {
      res.json(result.launchPoints);
    }
  });
});

// Route to launch a selected app
app.get('/launchApp/:appId', (req, res) => {
  const appId = req.params.appId; // Get appId from the URL parameter
  
  // Send the launch command to the TV using the appId
  lgtv.request('ssap://system.launcher/launch', { id: appId }, (err, result) => {
    if (err) {
      console.error('Error launching app:', err);
      res.status(500).send('Could not launch app');
    } else {
      res.send(`Launched app: ${appId}`);
    }
  });
});

// You can add more endpoints like mute, launch app, etc.

app.listen(port, () => {
  console.log(`Remote server running at http://localhost:${port}`);
});
