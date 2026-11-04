import { Player, system, world } from "@minecraft/server";
import { ActionFormData, FormCancelationReason, ModalFormData } from "@minecraft/server-ui";
import utils from "utils";

const ON = '§a●';
const OFF = '§7○';

function status(p: Player) {
    return `Muted ${p.inari_client_muted ? ON : OFF}  Deaf ${p.inari_client_deafened ? ON : OFF}\n`
        + `Force mute ${p.hasTag('muted') ? ON : OFF}  Force deaf ${p.hasTag('deafened') ? ON : OFF}`;
}

function setTag(p: Player, tag: string, value: boolean) {
    if (value) p.addTag(tag); else p.removeTag(tag);
}

async function showForm<T extends { show(p: Player): Promise<{ canceled: boolean; cancelationReason?: FormCancelationReason }> }>(
    player: Player, form: T
): Promise<Awaited<ReturnType<T['show']>> | undefined> {
    for (let i = 0; i < 20; i++) {
        const r = await form.show(player);
        if (!(r.canceled && r.cancelationReason === FormCancelationReason.UserBusy)) return r as any;
        await new Promise<void>((res) => system.runTimeout(res, 10));
    }
}

export async function openPlayerList(admin: Player) {
    const players = world.getAllPlayers().filter((p) => p.initialized);
    const form = new ActionFormData().title('Inari admin');
    if (players.length == 0) form.body('No player initialized.');
    players.forEach((p) => form.button(`${p.name}\n${p.hasTag('muted') ? '§cM ' : ''}${p.hasTag('deafened') ? '§cD ' : ''}${p.inari_client_muted ? '§6muted ' : ''}${p.inari_client_deafened ? '§6deaf' : ''}`));

    const r: any = await showForm(admin, form);
    if (!r || r.canceled) return;
    await openPlayerPanel(admin, players[r.selection]);
}

async function openPlayerPanel(admin: Player, target: Player) {
    if (!target.isValid) return openPlayerList(admin);

    const form = new ModalFormData()
        .title(target.name)
        .label(status(target))
        .toggle('Force mute', { defaultValue: target.hasTag('muted') })
        .toggle('Force deafen', { defaultValue: target.hasTag('deafened') });

    const r: any = await showForm(admin, form);
    if (!r || r.canceled) return;
    if (!target.isValid) return;

    const [, forceMute, forceDeafen] = r.formValues as [undefined, boolean, boolean];
    setTag(target, 'muted', forceMute);
    setTag(target, 'deafened', forceDeafen);
    admin.sendMessage(`${utils.prefix} §a${target.name}: force mute ${forceMute ? 'on' : 'off'}, force deafen ${forceDeafen ? 'on' : 'off'}`);
    await openPlayerList(admin);
}
