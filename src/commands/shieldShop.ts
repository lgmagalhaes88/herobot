import * as Discord from "discord.js";
import { JsonHandle } from "../utils/JsonHandle";
import { heroService } from "../services/heroService";
import { Hero } from "../models/hero";

/**
 * Informs all available items from selected type.
 * @param msg Discord last message related to the command
 */
export function shieldShop(msg: Discord.Message, hero: Hero) {
  const shields = JsonHandle.getAllShieldS();
  let defineMsg: string = "";
  shields.forEach(
    shield =>
      (defineMsg +=
        `Id: ${shield.id}\n` +
        `Name: ${shield.name}\n` +
        `Defence: ${shield.defence}\n` +
        `Price: ${shield.price}\n\n`)
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
        const shield = JsonHandle.getShieldById(+id);
        if (shield !== undefined) {
          if (hero.gold - shield.price >= 0) {
            const defenceDifference = shield.defence - hero.shield.defence;
            hero.gold -= shield.price;
            hero.shield = shield;

            if (defenceDifference > 0) {
              heroService
                .updateHero(hero)
                .then(() =>
                  msg.channel.send(
                    "You sucessfully bought`" +
                      shield.name +
                      "`. Your defence now is " +
                      shield.defence +
                      " (+" +
                      defenceDifference +
                      ")"
                  )
                )
                .catch(erro => {
                  console.error(erro);
                  msg.channel.send(
                    "We found a problem when we're delivering the shield to you"
                  );
                });
            } else {
              heroService
                .updateHero(hero)
                .then(() =>
                  msg.channel.send(
                    "You sucessfully bought`" +
                      shield.name +
                      "`. Your defence now is " +
                      shield.defence +
                      " (" +
                      defenceDifference +
                      ")"
                  )
                )
                .catch(erro => {
                  console.error(erro);
                  msg.channel.send(
                    "We found a problem when we're delivering the shield to you"
                  );
                });
            }
          } else {
            msg.channel.send(
              "So you want to buy a shield without enought money ?. It's not cool"
            );
          }
        } else {
          msg.channel.send("There is no shield with this id");
        }
      })
      .catch(() => {
        console.log("User do not answered");
      });
  });
}
