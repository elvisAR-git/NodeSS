const express = require('express')
const validate = require('./validators.js').validate
var Db = require('./db.js')
var createLog = require('./logger.js').createLog

let MyDB

Db.connect("ARDB").then((database) =>
{
    MyDB = database
}).catch((err) =>
{
    console.log("Could not connect to Database: ", err)
})

var app = express()
app.use(express.json({ type: 'application/json' }))
app.use(express.urlencoded())

var server = require('http').createServer(app)
var io = require('socket.io').listen(server)

var connections = []


// Http common

app.post("/create", (req, res) =>
{
    var user = req.body
    var check = validate(user)

    if (!check.error)
    {

        Db.push(MyDB, "Users", user).then((result) =>
        {
            createLog("ACCOUNT CREATION", "Successfully created user profile for " + user.username)
            res.status(201).send("Successfully created user profile for " + user.username)
        }).catch((err) =>
        {
            console.log("[!]ACCOUNT CREATION ERROR OCCURRED CHECK LOG FOR DETAILS")
            createLog("ACCOUNT CREATION", "!FAILED" + JSON.stringify(err))
            res.status(500).send(err)
        })
    } else
    {
        res.status(401).send(check.error.message)
    }


})

var SYSTEM_CHECK = "OK AND RUNNING"

app.get("", (req, res) =>
{
    res.status(200)
    res.send("<b style='font-size:30px; color:green;'>ARnet Chat Server</b> <hr> v1.0.1 <br>SYSTEM CHECK -->[<b>" + SYSTEM_CHECK + "</b>]<hr> <p style='font-family: mono; color: red; text-decoration: underline dotted 2px green;'>Built with node.js and Socket.io</p>")
})


var PORT = 5000 || process.env.PORT

server.listen(PORT, "192.168.100.35");
console.log("Server Running @", PORT)

var alive = []

var connected = []
// middleware


io.sockets.on('connect', (socket) =>
{
    connections.push(socket)
    console.log("Connected: %s sockets connected", connections.length)

    socket.on('disconnect', (data) =>
    {
        // disconnected
        console.log("Disconnected from -->", socket.id)
        connections.splice(connections.indexOf(socket), 1)
        console.log('Disconnected: %s sockets connected', connections.length)

        var ls = []
        connected.forEach(session =>
        {
            if (session.sock == socket.id)
            {
                io.emit("disconnected", session)

                console.log("DISCONECT<<>>", { UID: session.UID, sock: session.sock })

            } else
            {
                ls.push(session)
            }
        });
        connected = ls
    })
    socket.on('login', (credentials) =>
    {
        credentials = JSON.parse(credentials)
        var check = validate(credentials)

        if (check.error)
        {
            socket.emit("Error", check.error.message)
        } else
        {
            // io.sockets.emit('new message', { msg: data })
            Db.fetch(MyDB, "Users", 0).then((data) =>
            {
                data.forEach(account =>
                {
                    if (account.username === credentials.username && credentials.password == account.password)
                    {
                        // accept
                        account.password = undefined
                        account.sock_id = socket.id
                        socket.emit("accept login", account)
                        alive.push({ user: account, sock: socket })
                        connected.push({ UID: account.UID, sock: socket.id })
                        io.emit("connected", { UID: account.UID, sock: socket.id })

                    }
                });
            }).catch((err) =>
            {
                console.log("DB_SQL ERROR:", err.sqlMessage)
                socket.emit("Error", "Could not establish a connection")
            })
        }

    })

    socket.on('message', (message) =>
    {
        message = JSON.parse(message)
        // pushing to database
        Db.push(MyDB, "Messages", message).then((result) =>
        {
            // fetching the pushed item
            Db.get(MyDB, "Messages", result.insertId).then((data) =>
            {
                alive.forEach(acc =>
                {
                    if (acc.user.UID == data.receiver || acc.user.UID == data.sender)
                    {
                        console.log("Broadcasting to --->", acc.user.username)
                        acc.sock.emit("new message", data)
                    }
                });
            }).catch((err) =>
            {
                socket.emit("Error", err.sqlMessage)
            })
        }).catch((err) =>
        {
            socket.emit("Error", err.sqlMessage)
        })

    })

    //  this event emits all the alive sockets regardless of the relationship between the sockets
    // NOT recomended
    socket.on("get alive", (account) =>
    {
        var acc = []
        alive.forEach(account =>
        {
            acc.push(account.user)
        });
        socket.emit("alive", acc)
    })

    socket.on("get related", (account) =>
    {
        account = JSON.parse(account)
        let Matches = []

        Db.fetch(MyDB, "Users", 0).then((Users) =>
        {
            Db.fetch(MyDB, "Messages", 0).then((Messages) =>
            {
                Messages.forEach(message =>
                {
                    Users.forEach(user =>
                    {
                        if (message.sender == account.UID && message.receiver == user.UID)
                        {
                            // Drop the password field
                            user.password = undefined
                            if (!Matches.includes(user))
                            {
                                Matches.push(user)
                            }
                        } else if (message.receiver == account.UID && message.sender == user.UID)
                        {
                            // Drop the password field
                            user.password = undefined
                            if (!Matches.includes(user))
                            {
                                Matches.push(user)
                            }
                        }
                    });
                });
                socket.emit("related", Matches)
            })

        }).catch((err) =>
        {
            console.log(err)
        })

    })

    socket.on("get inbox", (account) =>
    {
        var threads = []

        var constraint = `receiver=${account.UID} OR sender=${account.UID}`

        Db.filter(MyDB, "Messages", constraint).then((result) =>
        {
            socket.emit("inbox", result)

        }).catch((err) =>
        {
            console.log(err)
        })
    })


    socket.on("delete", (id) =>
    {
        Db.delete(MyDB, "Messages", "id", `=${id}`).then((result) =>
        {
            console.log(result)
        }).catch((err) =>
        {
            console.log(err)
        })

    })


    socket.on("get messages for", (id1, id2) =>
    {
        var constraint = `(receiver=${id1} AND sender=${id2}) OR (receiver=${id2} AND sender=${id1})`
        Db.filter(MyDB, "Messages", constraint).then((result) =>
        {
            socket.emit("messages for", result)

        }).catch((err) =>
        {
            socket.emit("Error", err)
        })
    })


    socket.on("get profile", (email) =>
    {
        console.log("Profile fetch---->", email)
        Db.get(MyDB, "Users", `"${email}"`, "email").then((result) =>
        {
            if (result)
            {
                connected.forEach(session =>
                {
                    if (session.UID == result.UID)
                    {
                        // online
                        result.online = "true"
                        result.sock_id = session.sock
                    }
                });
                console.log(connected)
                socket.emit('profile', result)
            } else
            {
                console.log("FETCH ERROR:", email)
                socket.emit("Erorr", "User is not registered to chat server")
            }
        }).catch((err) =>
        {
            console.log("ACCESS DENIED")
        })
    })


})
