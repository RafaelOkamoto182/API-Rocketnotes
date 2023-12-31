const AppError = require('../utils/AppError')
const { hash, compare } = require('bcryptjs')
const sqliteConnection = require("../database/sqlite")

class UserController {
    /* 
        - Index -> GET para listar vários registros
        - Show -> GET para listar um registro específico
        - Create -> POST para criar um registro
        - Update -> PUT para atualizar um registro
        - Delete -> DELETE para excluir um registro

        Nessa arquitetura, caso a classe precise de mais de 5 métodos, provavelmente faz sentido criar um novo controller pra ela.
    */

    async create(req, res) {
        const { name, email, password } = req.body

        const db = await sqliteConnection()
        const emailAlreadyUsed = await db.get("SELECT * FROM users WHERE email = (?)", [email])

        if (emailAlreadyUsed) {
            throw new AppError("E-mail already in use")
        }

        const hashedPassword = await hash(password, 8)

        await db.run("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hashedPassword])

        return res.status(201).json()
    }

    async update(req, res) {
        const { name, email, password, old_password } = req.body
        const user_id = req.user.id

        const db = await sqliteConnection()
        const user = await db.get("SELECT * FROM users WHERE id = (?)", [user_id])

        if (!user) {
            throw new AppError("User not found")
        }

        const userWithNewGivenEmail = await db.get("SELECT * FROM users WHERE email = (?)", [email])

        if (userWithNewGivenEmail && userWithNewGivenEmail.id !== user.id) {
            throw new AppError("Email already in use")
        }

        //nullish operator: se existir o primeiro, será o primeiro. Senao será o segundo
        user.name = name ?? user.name
        user.email = email ?? user.email

        if (password && !old_password) {
            throw new AppError("You need to provide the old password in order to change password")
        }

        if (password && old_password) {
            const checkOldPassword = await compare(old_password, user.password)

            if (!checkOldPassword) {
                throw new AppError("Old password is wrong")
            }

            user.password = await hash(password, 8)
        }

        await db.run(`
        UPDATE users SET
        name = ?,
        email = ?,
        password =?,
        updated_at = DATETIME('now')
        WHERE 
        id = ?`,
            [name, email, user.password, user_id]
        )

        return res.json()
    }


    getUsers(req, res) {
        const { page, limit } = req.query

        res.status(200).send(`Pagina: ${page}. Limite de usuarios: ${limit}`)
    }
}

module.exports = UserController