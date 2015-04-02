# Random Drawing app

This is a very small random, live giveaway drawing/contest application. It uses [Node.js](http://nodejs.org), [Expressjs](http://expressjs.com), and [Socket.io](http://socket.io) to create a bi-directional system between the person ("admin") running the contest and the people entering it ("entrants"). There really isn't much "configuration" to do, you can clone this project, start up the app, and people can connect!

## Setup and Starting the App

```
~$ git clone git@github.com:jakerella/random-draw.git
   ...
~$ cd random-draw
~/random-draw$ npm install
   ...
~/random-draw$ node server/app.js
```

## Creating a New Drawing

Once you have the app running, just navigate to the URL (or localhost) and head to the `/setup` URL. _Note that there is no "homepage", you must first go to the /setup page!_ For example, if you are running this locally and don't have a specific `PORT` set up in your environment variables you could go to: http://localhost:8686/setup

Once there, just fill our the three fields and click "Create Drawing". A link will appear to the newly created drawing admin page. The URL of the contest will be at the top of the admin page and you can have people go there to enter. _Note that the page for people to enter the drawing is dynamically created, thus they cannot go there before you create the drawing!_

## Why?

Well, I need a random drawing application and I was tired of using http://random.org (basically, one random number of the row, one for the seat in that row). Also, this is interactive! And it demonstrates a good use for websockets. And because I was bored one weekend.

## Can I help?

Sure! Feel free to submit a pull request, I'm open to features and such. That said, I do want to keep this simple. Things you could do: make it prettier, make the animations ease in and out (?), make some of the interactivity optional for the admin, add interactivity (camera usage?, touch?), organize the code better, etc.


_Notes_

* [Ting](http://soundbible.com/1628-Ting.html) and [Cheering](http://soundbible.com/621-Cheering.html) sounds curtesy of Soundible (check site for license).
* This code is what it is... I can't help support you with it in any way, and please be careful how you use it... this isn't production code.
* Have people turn up the volume on their devices. :)
