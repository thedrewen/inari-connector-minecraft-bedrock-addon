import { world } from "@minecraft/server";
class Utils {
    constructor() {
        this.prefix = '§e[§cInariConnector§e]§c ';
    }
    getRndInteger(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    getStaffPlayers() {
        return world.getPlayers({ tags: ['staff'] });
    }
    logStaff(message) {
        this.getStaffPlayers().forEach((p) => p.sendMessage(this.prefix + message));
    }
    makeid(length) {
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }
    generateCode() {
        return this.makeid(6);
    }
}
export default new Utils();
