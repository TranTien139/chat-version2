var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var mongoose = require('mongoose');

var users={}

mongoose.connect('mongodb://localhost/chat',function(err){
  if(err){
    console.log(err);
  }else{
    console.log('connect mongodb success');
  }
});

var chatSchema = mongoose.Schema({
 // name: {first: String, last: String}
   nick: String,
   msg: String,
   created:{type:Date, default: Date.now}
});

var Chat = mongoose.model('messages',chatSchema);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){

  var query = Chat.find({});
  query.sort('-created').limit(8).exec(function(err, docs){
     if(err) throw err;
     socket.emit('load old message', docs);
  });
  socket.on('new user',function(data, callback){
  	if(data in users){
  	callback(false);
  	} else{
  		callback(true);
  		socket.nickname = data;
      users[socket.nickname] = socket;
  		updateNickName();
  		
  	}
  });
  socket.on('chat message', function(data, callback){
    var msg = data.trim();
    if(msg.substr(0,3)==='/w '){
      msg = msg.substr(3);
      var ind = msg.indexOf(' ');
      if(ind != -1){
        var name = msg.substring(0,ind);
        var msg = msg.substring(ind+1);
        if(name in users){
          users[name].emit('whisper', {msg:msg, nick:socket.nickname});
        }else{
          callback('Error ! enter of valid user');
        }
      }else{
        callback('Error ! plesase enter message for you wish');
      }
    }else{
      var newMsg = new Chat({msg:msg, nick:socket.nickname});
      newMsg.save(function(err){
        if(err) throw err;
        io.sockets.emit('new message', {msg:msg, nick:socket.nickname});
      });
      
  }
  });

  function updateNickName(){
  	io.sockets.emit('usernames',Object.keys(users));
  }

  socket.on('disconnect', function(data){
  	if(!socket.nickname) return;
    delete users[socket.nickname];
  	updateNickName();
  });
});

server.listen(3000, function(){
  console.log('listening on :3000');
});
