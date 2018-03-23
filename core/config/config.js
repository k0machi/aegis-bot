class Config {
    constructor(db, log) {
        this.db = db;
        this.log = log;
        this.cache = {};
    }

    async init() {
        try {
            await this.db.get("SELECT * FROM Config WHERE guildid = 0");
        } catch (error) {
            this.log.warn(error);
            await this.db.run("CREATE TABLE IF NOT EXISTS Config(guildid TEXT NOT NULL, namespace TEXT NOT NULL, key TEXT NOT NULL, value TEXT, PRIMARY KEY(guildid, namespace, key))");
        }
    }

    /**
     * @throws If write to database fails or if key is malformed
     * @param {number} guildId 
     * @param {string} compositeKey 
     * @param {any} value 
     */
    async setValue(guildId, compositeKey, value) {
        let [namespace, key] = compositeKey.split(".");
        if(!namespace || !key)
            throw {message: "Malformed key "+ compositeKey};
        await this.db.run("REPLACE INTO Config ([guildid], [namespace], [key], [value]) VALUES (?, ?, ?, ?)", [guildId, namespace, key, value]);
        if(this.cache[guildId] === undefined) {
            this.cache[guildId] = {};
        }
            
        if(this.cache[guildId][namespace] === undefined) {
            this.cache[guildId][namespace] = {};
        }

        this.cache[guildId][namespace][key] = value;
    }

    checkCache(guildId, namespace, key) {
        return (((this.cache[guildId] || {})[namespace] || {})[key]);
    }

    /**
     * @throws If read from database fails
     * @param {number} guildId 
     * @param {string} compositeKey 
     */
    async getValue(guildId, compositeKey)
    {
        let [namespace, key] = compositeKey.split(".");
        if(!namespace || !key)
            return undefined;
        let hit = this.checkCache(guildId, namespace, key);
        if(hit !== undefined) {
            return hit;
        } else {
            let checkDb = await this.db.get("SELECT * FROM Config WHERE guildid = ? AND namespace = ? AND key = ?", [guildId, namespace, key]);
            if(checkDb == undefined)
                return undefined;
                
            if(this.cache[guildId] === undefined) {
                this.cache[guildId] = {};
            }
                
            if(this.cache[guildId][namespace] === undefined) {
                this.cache[guildId][namespace] = {};
            }
    
            this.cache[guildId][namespace][key] = checkDb.value;
            return checkDb.value;
        }
        
    }


    async getValueJSON(guildId, compositeKey)
    {
        let raw = await this.getValue(guildId, compositeKey);
        let parsed = {};
        if(raw != undefined)
            parsed = JSON.parse(raw);
        return parsed;
    }

}

module.exports = Config;