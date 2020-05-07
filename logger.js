const fs = require('fs')

function createLog(source, slug)
{
    fs.exists("./sys_err.log", (exists) =>
    {
        if (exists)
        {
            fs.appendFile('sys_err.log', `
                [${source}]---[${new Date().toUTCString()}---[${slug}]]
            `, (err) =>
            {
                if (err) throw err
            })

        } else
        {
            fs.open('sys_err.log', 'w', (err) =>
            {
                if (err) throw err
            })
        }
    })

}

module.exports = {
    createLog: createLog
}