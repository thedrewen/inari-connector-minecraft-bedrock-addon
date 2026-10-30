import { CommandPermissionLevel, CustomCommandParamType, Player, system, world } from "@minecraft/server";
import { secrets, variables } from "@minecraft/server-admin";
import { websocket } from "@minecraft/server-net";
import { InitPlayer } from "entities/player";
import utils from "utils";
class InariAddons {
    constructor() {
        this.timer = 0;
        world.afterEvents.worldLoad.subscribe(() => system.run(() => this.initEarlyExecution()));
    }
    async connect() {
        this.ws = await websocket.connect(variables.get("INARI_WS_URL"));
        system.runTimeout(() => {
            utils.logStaff('§aauthentication...');
            console.log('authentication...');
            this.ws.send(JSON.stringify({ kind: 'auth', data: { is_server: true, channel: 'default', auth_key: secrets.get("INARI_API_KEY") }, transaction_uuid: 'auth' }));
        }, 20 * 3);
        this.ws.afterEvents.message.subscribe((event) => {
            try {
                const payload = JSON.parse(event.message);
                const kind = payload.kind;
                const data = payload.data;
                if (kind == 'auth') {
                    utils.logStaff('§aInari connected !');
                    console.log('Inari connected !');
                }
            }
            catch (error) {
                utils.logStaff('ERROR With Payload : ' + event.message);
                console.log('ERROR With Payload : ' + event.message);
            }
        });
        this.ws.afterEvents.close.subscribe((event) => {
            utils.logStaff(`§cConnection to Inari closed.`);
            console.log(`Connection to Inari closed.`);
            utils.logStaff(`§eReconnecting in 5 seconds.`);
            console.log(`Reconnecting in 5 seconds.`);
            system.runTimeout(() => {
                this.connect();
            }, 20 * 5);
        });
    }
    async initEarlyExecution() {
        await this.connect();
        world.getAllPlayers().forEach((p) => InitPlayer(p));
        world.afterEvents.playerSpawn.subscribe((e) => {
            system.runTimeout(() => {
                InitPlayer(e.player);
            }, 20 * 3);
        });
        system.runInterval(() => this.clock(), 6);
        utils.logStaff('§aInari loaded !');
        console.log('Inari loaded !');
    }
    async clock() {
        this.timer += 6;
        if (this.ws.isOpen) {
            const players = world.getAllPlayers().filter((p) => p.initialized).map((p) => {
                return {
                    position: [p.location.x, p.location.y, p.location.z],
                    head: [p.getViewDirection().x, p.getViewDirection().y, p.getViewDirection().z],
                    code: p.inariCode,
                    muted: p.hasTag('muted')
                };
            });
            this.ws.send(JSON.stringify({
                kind: 'clients',
                transaction_uuid: utils.makeid(100),
                data: { clients: players }
            }));
        }
    }
}
new InariAddons();
system.beforeEvents.startup.subscribe((s) => {
    s.customCommandRegistry.registerCommand({ name: 'inari:inari', description: 'Give inari code.', cheatsRequired: false, permissionLevel: CommandPermissionLevel.Any }, (o) => {
        if (o.sourceEntity instanceof Player) {
            o.sourceEntity.sendMessage(`${utils.prefix} Inari code : ${o.sourceEntity.inariCode}`);
        }
    });
    s.customCommandRegistry.registerCommand({ name: 'inari:inariadmin-mute', description: 'Mute or unmute a player.', cheatsRequired: false, permissionLevel: CommandPermissionLevel.Admin, mandatoryParameters: [{ name: 'target', type: CustomCommandParamType.PlayerSelector }] }, (o, args) => {
        const [target] = args;
        if (o.sourceEntity instanceof Player) {
            if (target.hasTag('muted')) {
                target.removeTag('muted');
                o.sourceEntity.sendMessage(`${utils.prefix} ${target.name} §aunmuted!`);
                target.sendMessage(`${utils.prefix} §aYou are now unmuted!`);
            }
            else {
                target.addTag('muted');
                o.sourceEntity.sendMessage(`${utils.prefix} ${target.name} §cmuted!`);
                target.sendMessage(`${utils.prefix} §cYou are now muted!`);
            }
        }
    });
});
