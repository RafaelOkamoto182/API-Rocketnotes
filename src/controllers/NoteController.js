const knex = require("../database/knex")

class NoteController {

    async create(req, res) {
        const { title, description, tags, links } = req.body
        const user_id = req.user.id

        const [note_id] = await knex('notes').insert({
            title,
            description,
            user_id
        })

        const linksToInsert = links.map((link) => {
            return {
                note_id,
                url: link
            }
        })

        await knex('links').insert(linksToInsert)

        const tagsToInsert = tags.map((tagName) => {
            return {
                user_id,
                note_id,
                name: tagName
            }
        })

        await knex('tags').insert(tagsToInsert)

        return res.json()
    }

    async getById(req, res) {
        const { id } = req.params

        const note = await knex('notes').where({ id }).first()
        const tags = await knex('tags').where({ note_id: id }).orderBy('name')
        const links = await knex('links').where({ note_id: id }).orderBy('created_at')

        return res.json({
            ...note,
            tags,
            links
        })
    }

    async delete(req, res) {
        const { id } = req.params

        await knex('notes').where({ id }).delete()

        return res.json()
    }

    async get(req, res) {
        const { title, tags } = req.query
        const user_id = req.user.id

        let notes

        if (tags) {

            const filterArray = tags.split(',').map(tag => tag.trim())

            notes = await knex('tags')
                .whereIn('name', filterArray)
                .select(['notes.id', 'notes.title', 'notes.user_id'])
                .where("notes.user_id", user_id)
                .whereLike("notes.title", `%${title}%`)
                .innerJoin('notes', 'notes.id', 'tags.note_id')
                .groupBy('notes.id')
                .orderBy('notes.title')

        } else {

            notes = await knex("notes")
                .where({ user_id })
                .whereLike("title", `%${title}%`)
                .orderBy("title")
        }

        const tagsOwnedByUser = await knex("tags").where({ user_id })
        const notesWithTags = notes.map(note => {
            const noteCorrespondingTags = tagsOwnedByUser.filter(tag => tag.note_id === note.id)
            return {
                ...note,
                tags: noteCorrespondingTags
            }

        })

        return res.json(notesWithTags)
    }
}

module.exports = NoteController