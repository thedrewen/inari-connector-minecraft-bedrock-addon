import { CommandPermissionLevel, CustomCommandParamType, Player, system, world } from "@minecraft/server";
import { variables } from "@minecraft/server-admin";
import { websocket, WebSocketClient } from "@minecraft/server-net";
import { InitPlayer } from "entities/player";
import utils from "utils";
import { openPlayerList } from "admin";

class InariAddons {

    private ws!: WebSocketClient;
    public timer: number = 0;

    constructor() {
        world.afterEvents.worldLoad.subscribe(() => system.run(() => this.initEarlyExecution()));
    }

    async connect() {
        return new Promise(async (res) => {
            this.ws = await websocket.connect(variables.get("INARI_WS_URL") as string);
            system.runTimeout(() => {
                utils.logStaff('§aauthentication...');
                console.log('authentication...');
                const apikey = variables.get("INARI_API_KEY") as string | undefined;
                if (apikey) {
                    this.ws.send(JSON.stringify({ kind: 'auth', data: { is_connector: true, channel: 'default', auth_key: apikey }, transaction_uuid: 'auth' }));
                } else {
                    utils.logStaff('§cInvalid INARI_API_KEY !');
                    console.log('§cInvalid INARI_API_KEY !');
                }

                res(0);
            }, 20);
            this.ws.afterEvents.message.subscribe((event) => {

                let payload = null;
                try {
                    payload = JSON.parse(event.message);
                } catch (error) {
                    utils.logStaff('ERROR With Payload : ' + event.message);
                    console.log('ERROR With Payload : ' + event.message)
                    return;
                }
                const kind = payload.kind;
                const data = payload.data;
                if (kind == 'auth') {
                    utils.logStaff('§aInari connected !');
                    console.log('Inari connected !')
                } else if (kind == 'error') {
                    utils.logStaff('§aInari ERROR : ' + event.message);
                    console.log('Inari ERROR : ' + event.message)
                } else if (kind == 'sync_connector_state') {
                    data.connections.forEach((c: { code: string, is_muted: boolean, is_deafened: boolean }) => {
                        const p = world.getAllPlayers().find((p) => p.inariCode == c.code);
                        if (p) {
                            if (p.inari_client_muted != c.is_muted) {
                                p.inari_client_muted = c.is_muted;
                                p.sendMessage(`${utils.prefix} ${!c.is_muted ? '§aYou are now unmuted!' : '§aYou are now muted!'}`);
                            }
                            if (p.inari_client_deafened != c.is_deafened) {
                                p.inari_client_deafened = c.is_deafened;
                                p.sendMessage(`${utils.prefix} ${!c.is_deafened ? '§aYou are now undeafened!' : '§aYou are now deafened!'}`);
                            }
                        }
                    });
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
        })
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
            const players: { position: number[], head: number[], code: string, is_force_muted: boolean, is_force_deafened: boolean }[] = world.getAllPlayers().filter((p) => p.initialized).map((p) => {

                let toggle_muted = false;
                if (p.toggle_muted) {
                    toggle_muted = true;
                    p.toggle_muted = false;
                }
                let toggle_deafened = false;
                if (p.toggle_deafened) {
                    toggle_deafened = true;
                    p.toggle_deafened = false;
                }
                return {
                    position: [p.location.x, p.location.y, p.location.z],
                    head: [p.getViewDirection().x, p.getViewDirection().y, p.getViewDirection().z],
                    code: p.inariCode,
                    is_force_muted: p.hasTag('muted'),
                    is_force_deafened: p.hasTag('deafened'),
                    group: p.dimension.id,
                    display_name: p.name,
                    actions: {
                        toggle_muted,
                        toggle_deafened
                    }
                }
            });

            this.ws.send(JSON.stringify({
                kind: 'sync_connector_state',
                transaction_uuid: utils.makeid(100),
                data: { clients: players }
            }));
        }

    }
}

new InariAddons();


system.beforeEvents.startup.subscribe((s) => {
    s.customCommandRegistry.registerCommand(
        { name: 'inari:inari', description: 'Give inari code.', cheatsRequired: false, permissionLevel: CommandPermissionLevel.Any },
        (o) => {
            if (o.sourceEntity instanceof Player) {
                o.sourceEntity.sendMessage(`${utils.prefix} Inari code : ${o.sourceEntity.inariCode}`);
            }
        }
    )

    s.customCommandRegistry.registerCommand(
        { name: 'inari:mute', description: 'Allows you to mute yourself.', cheatsRequired: false, permissionLevel: CommandPermissionLevel.Any },
        (o) => {
            if (o.sourceEntity instanceof Player) {
                o.sourceEntity.toggle_muted = true;
            }
        }
    )

    s.customCommandRegistry.registerCommand(
        { name: 'inari:deafen', description: 'Allows you to deafen yourself.', cheatsRequired: false, permissionLevel: CommandPermissionLevel.Any },
        (o) => {
            if (o.sourceEntity instanceof Player) {
                o.sourceEntity.toggle_deafened = true;
            }
        }
    )

    s.customCommandRegistry.registerCommand(
        { name: 'inari:admin', description: 'Open the Inari admin panel.', cheatsRequired: false, permissionLevel: CommandPermissionLevel.GameDirectors },
        (o) => {
            if (o.sourceEntity instanceof Player) {
                const admin = o.sourceEntity;
                system.run(() => openPlayerList(admin));
            }
        }
    )
});
