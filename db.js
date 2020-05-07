const mysql = require('mysql')

var HOST = "localhost" //or ip address
var USER = "elvis"
var PASSWORD_TXT = "moraaelvis"

//MoraaElvis@CoffeeAfrica1

function connectToDatabase(databaseName)
{
    return new Promise((resolve, reject) =>
    {
        var database = mysql.createConnection(
            {
                host: HOST,
                user: USER,
                password: PASSWORD_TXT,
                database: databaseName,
                charset: 'utf8mb4',              //correct charset for emojis
                collation: 'utf8mb4_unicode_ci',
            }, (err) =>
        {
            if (err) reject(err)
        }
        )
        resolve(database)

    })
}



function getCollection(database, table, limit = 0)
{
    if (limit == 0) limit = "*"
    limit = limit.toString()

    var query = `SELECT ${limit} FROM ${table}`

    return new Promise((resolve, reject) =>
    {
        // running query
        database.query(query, (err, result, fields) =>
        {
            if (err) reject(err)
            resolve(result)
        })
    })
}

function Insert(database, table, data = {})
{
    return new Promise((resolve, reject) =>
    {
        var sql = "INSERT INTO " + table + " SET ?";
        database.query(sql, data, (err, result) =>
        {
            if (err) reject(err)
            resolve(result)
        })
    })

}


function FetchViaId(database, table, id, alias = undefined)
{
    var sql = ""
    if (!alias)
    {
        sql = "SELECT * FROM " + table + " WHERE id=" + id
    } else
    {
        sql = "SELECT * FROM " + table + " WHERE " + alias + "=" + id
    }
    return new Promise((resolve, reject) =>
    {
        database.query(sql, (err, result) =>
        {
            if (err) reject(err)
            resolve(result[0])
        })
    })
}


function Delete(database, table, column, condition)
{
    var sql = `DELETE FROM ${table} WHERE ${column}${condition}`
    return new Promise((resolve, reject) =>
    {
        database.query(sql, (err, result) =>
        {
            if (err) reject(err)
            resolve(result)
        })
    })
}

function Filter(database, table, constraint)
{
    // constraint is an evaluated string e.g id=5
    var sql = `SELECT * FROM ${table} WHERE ${constraint}`
    return new Promise((resolve, reject) =>
    {
        database.query(sql, (err, result) =>
        {
            if (err) reject(err)
            resolve(result)

        })
    })
}


module.exports = {
    connect: async (databaseName) =>
    {
        let database = await connectToDatabase(databaseName)
        return database
    },
    fetch: async (database, table, limit) =>
    {
        let result = await getCollection(database, table, limit)
        return result
    },
    push: async (database, table, data = {}) =>
    {
        let result = await Insert(database, table, data)
        return result
    },
    get: async (database, table, id, alias) =>
    {
        let result = await FetchViaId(database, table, id, alias)
        return result
    },
    filter: async (database, table, constraint) =>
    {
        let result = await Filter(database, table, constraint)
        return result
    },
    delete: async (database, table, column, condition) =>
    {
        let result = await Delete(database, table, column, condition)
        return result
    }
}

