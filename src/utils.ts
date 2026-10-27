import { Player, system, world } from "@minecraft/server";

class Utils {
    public prefix: string = '§e[§cInariConnector§e]§c ';

    getRndInteger(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    getStaffPlayers(): Player[] {
        return world.getPlayers({ tags: ['staff'] });
    }

    logStaff(message: string) {
        this.getStaffPlayers().forEach((p) => p.sendMessage(this.prefix + message));
    }

    makeid(length: number) {
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