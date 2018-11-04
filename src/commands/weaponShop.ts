import * as Discord from "discord.js";
import { JsonHandle } from "../utils/JsonHandle";
import { Hero } from "../models/hero";
import { heroService } from "../services/heroService";

/**
 * Informs all available items from selected type.
 * @param msg Discord last message related to the command
 */
export function weaponShop(msg: Discord.Message, hero: Hero) {
  const weapons = JsonHandle.getAllWeapons();
  let defineMsg: string = "";
  weapons.forEach(
    weapon =>
      (defineMsg +=
        `Id: ${weapon.id}\n` +
        `Name: ${weapon.name}\n` +
        `Damage: ${weapon.damage}\n` +
        `Price: ${weapon.price}\n\n`)
  );
  msg.channel.send(defineMsg).then(() => {
    msg.channel
      .awaitMessages(responseName => responseName.author.id === msg.author.id, {
        max: 1,
        time: 10000,
        errors: ["time"]
      })
      .then(response => {
        const id = response.first().content;
        const weapon = JsonHandle.getWeaponById(+id);
        if (weapon !== undefined) {
          if (hero.gold - weapon.price >= 0) {
            const damageDifference = weapon.damage - hero.weapon.damage;
            hero.gold -= weapon.price;
            hero.weapon = weapon;

            if (damageDifference > 0) {
              heroService
                .updateHero(hero)
                .then(() =>
                  msg.channel.send(
                    "You sucessfully bought`" +
                      weapon.name +
                      "`. Your damage now is " +
                      weapon.damage +
                      " (+" +
                      damageDifference +
                      ")"
                  )
                )
                .catch(erro => {
                  console.error(erro);
                  msg.channel.send(
                    "We found a problem when we're delivering the weapon to you"
                  );
                });
            } else {
              heroService
                .updateHero(hero)
                .then(() =>
                  msg.channel.send(
                    "You sucessfully bought`" +
                      weapon.name +
                      "`. Your damage now is " +
                      weapon.damage +
                      " (" +
                      damageDifference +
                      ")"
                  )
                )
                .catch(erro => {
                  console.error(erro);
                  msg.channel.send(
                    "We found a problem when we're delivering the weapon to you"
                  );
                });
            }
          } else {
            msg.channel.send(
              "So you want to buy a weapon without enought money ?. It's not cool"
            );
          }
        } else {
          msg.channel.send("There is no weapons with this id");
        }
      });
  });
}
