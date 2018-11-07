import { BaseEntityService } from "./baseEntityService";
import { Hero } from "../models/hero";
import { Monster } from "../interfaces/monster";
import { getTimeStampFormated } from "../utils/time";
import { ProficienceType } from "../enums/proficienceType";
import { Action } from "../enums/action";
import { Proficience } from "../interfaces/proficience";
import { PlayStatus } from "../interfaces/playStatus";
import { HeroDieError } from "../errors/heroDieError";
import { JsonHandle } from "../utils/JsonHandle";
import { randomNumber } from "../utils/random";

class HeroService extends BaseEntityService<Hero> {
  private route = "/heros";

  createhero(hero: Hero): Promise<void> {
    return super.set(this.route + "/" + hero.id, hero);
  }

  findbyUserID(id: string): Promise<Hero> {
    return super.find(this.route, id).then(hero => {
      return new Promise<Hero>(resolve => {
        let heroGet: Hero;
        heroGet = hero;
        if (hero !== null) {
          heroGet = Object.assign(new Hero(), hero);
          heroGet.id = id;
        }
        resolve(heroGet);
      });
    });
  }

  remove(id: string): Promise<void> {
    return super.delete(this.route, id);
  }

  updateHero(hero: Hero) {
    return super.update(this.route, hero);
  }

  /**
   * Calculate the total amount of damage that will be gived based in the damage value and bonus.
   * @param damage weapon
   * @param bonus proficience
   */
  calcDamage(damage: number, bonus?: number): number {
    if (damage !== undefined) {
      if (bonus === undefined) bonus = 0;
      return Math.floor(damage * 1.8 + bonus);
    }
    return 0;
  }

  /**
   * Return the total amount of defence
   */
  heroDefence(hero: Hero): number {
    if (hero !== undefined) {
      return this.calcDefence(
        hero.shield.defence,
        hero.shieldProficience.level
      );
    }
  }

  /**
   * Calculate the percentage of damage that will be reduced from an atack.
   * Defence is based in percentage
   * @param defence armo
   * @param bonus proficience
   */
  calcDefence(defence: number, bonus?: number): number {
    if (defence !== undefined) {
      if (bonus === undefined) bonus = 1;
      return Math.floor(defence * 1.2 + bonus);
    }
    return 0;
  }

  /**
   * Calculate the amount of hp will be taken from an atack based in a defence
   * @param damage value(calculated) of damage that the atacker will give
   * @param defence value(%) that will be reduced from the atack
   */
  calcDamageTaken(damage: number, defence: number): number {
    if (damage !== undefined && defence !== undefined) {
      return damage - defence >= 0 ? damage - defence : 0;
    }
  }

  /**
   * Reduces monster's life based in hero attack value
   * @param hero who will atack the monster
   * @param monster the monster that will be attacked
   */
  attackMonster(hero: Hero, monster: Monster) {
    if (hero !== undefined && monster !== undefined) {
      monster.hp =
        monster.hp -
        this.calcDamageTaken(
          this.calcDamage(hero.weapon.damage, hero.damageProficience.level),
          this.calcDefence(monster.shield)
        );
    }
  }

  /**
   * Reduces hero's life based in a monster attack value
   * @param hero who will defend monster attack
   * @param monster monster who will atack hero
   */
  defendAttack(hero: Hero, monster: Monster) {
    hero.hpActual =
    hero.hpActual -
      this.calcDamageTaken(
        this.calcDamage(monster.damage),
        this.calcDefence(hero.shield.defence, hero.shieldProficience.level)
      );
  }

  /**
   * Calcs the amount of experience in Shield or Damage proficience the hero will get
   * @description It gets the actual timestamp and subtract from the time that the hero
   * started train.(The time is got in minutes and each minute is equal a random number between 5 an 20).
   * It also adjusts the level of proficiency if it increases
   * @example 1min = 5~20 exp points
   * @param hero Who will have the proficience points calculated
   */
  upgradeProficience(hero: Hero) {
    let proficience: Proficience;

    if (hero.trainDamageStartedTime !== undefined) {
      proficience = hero.damageProficience;
    } else if (hero.trainShieldStartedTime !== undefined) {
      proficience = hero.shieldProficience;
    } else {
      return;
    }

    let timeTrained;

    if (hero.actionStatus === undefined) {
      timeTrained = getTimeStampFormated() - hero.trainShieldStartedTime;

      hero.actionStatus = {
        action: Action.SHIELD_TRAINING,
        exp: 0,
        time: getTimeStampFormated()
      };

      if (proficience.type === ProficienceType.DAMAGE) {
        hero.actionStatus.action = Action.DAMAGE_TRAINING;
      }
      // If the user alredy invoked the command "status"
    } else {
      timeTrained = getTimeStampFormated() - hero.actionStatus.time;
    }

    const exp = this.generateExpTotal(timeTrained);

    hero.actionStatus.exp += exp;
    hero.actionStatus.time = getTimeStampFormated();

    return getTimeStampFormated() - hero.trainShieldStartedTime;
  }

  /**
   * Calcs the amount of exp the hero will receive in the given time and
   * convert it to minutes.
   * @param time Time to calculate the exp. The value must be in TimeStamp
   * without milliseconds
   */
  generateExpTotal(time: number): number {
    time = Math.floor((time / 60) % 60);
    let total: number = 0;
    for (let i = 0; i < time; i++) {
      total += randomNumber(5, 20);
    }
    return total;
  }

  /**
   * Updated playstatus.time with the actual timestamp and calcs user training bounties
   * @throws heroDieError if the hero died in exploration
   */
  updateHeroTraining(hero: Hero): PlayStatus {
    return this.calcheroTrainingBase(hero, false);
  }

  /**
   * Set the adventureStarted time with undefined and calcs user training bounties
   * @throws heroDieError if the hero died in exploration
   */
  finishHeroTraining(hero: Hero): PlayStatus {
    return this.calcheroTrainingBase(hero, true);
  }

  /**
   * Calcs what the hero got in exploration.
   * @param hero Who will have him bounts calculated
   * @param finishTraning Defines if the training must end (then the value that store when the
   * hero started training is set to 'undefined') or updated (then the value that store when
   * the hero started training is set to the value in 'getTimeStampFormated()' method
   * @return Result of hero exploration
   * @throws heroDieError of type PlayStatus meaning that the hero died in exploration
   */
  private calcheroTrainingBase(
    hero: Hero,
    finishTraning: boolean
  ): PlayStatus {
    const monster = JsonHandle.getMonsterById(hero.adventure.idMonster);
    const fullMonsterHp = monster.hp;

    let time;
    if (hero.actionStatus === null) {
      time = getTimeStampFormated() - hero.adventureStartedTime;

      hero.actionStatus = {
        action: Action.EXPLORING,
        gold: 0,
        monstersKilled: 0,
        exp: 0,
        time: 0
      };
    } else {
      time = getTimeStampFormated() - hero.actionStatus.time;
    }

    // Time in minutes
    const timeTrained = Math.floor(time / 60);

    // Each value is a second, each second is a hit.
    // MUST REFATORE (Remove the loop and make the calc based in the timeTrained)
    for (let i = 0; i <= timeTrained; i++) {
      // hero always hit the monster first
      heroService.attackMonster(hero, monster);

      if (monster.hp <= 0) {
        hero.actionStatus.exp += monster.givedXp;
        hero.actionStatus.gold += monster.givedGold;
        hero.actionStatus.monstersKilled++;
        monster.hp = fullMonsterHp;
      }

      // Monster attacks hero
      heroService.defendAttack(hero, monster);

      // hero died in exploration, so the number of gold, exp, monsters killed and
      // death is setted in his profile.
      if (hero.hpActual <= 0) {
        hero.deaths++;
        hero.monstersKilled += hero.actionStatus.monstersKilled;
        hero.gold += hero.actionStatus.gold;
        hero.xp += hero.actionStatus.exp;

        if (hero.xp > hero.levelMaxXp) {
          while (hero.xp > hero.levelMaxXp) {
            const nextLevel = JsonHandle.getLevelById(hero.level + 1);
            hero.xp = hero.xp - hero.levelMaxXp;
            hero.levelMaxXp = nextLevel.exp;
            hero.level++;
            hero.hpTotal = hero.hpActual = nextLevel.hp;
          }
        }

        hero.hpActual = hero.hpTotal;

        const status: PlayStatus = {
          action: Action.EXPLORING,
          exp: hero.actionStatus.exp,
          time: time,
          gold: hero.actionStatus.gold,
          monstersKilled: hero.actionStatus.monstersKilled
        };

        hero.adventureStartedTime = 0;
        hero.actionStatus = null;
        hero.adventure = null;

        this.updateHero(hero);
        throw new HeroDieError(status);
      }
    } // hero didn't dead in exploration

    hero.actionStatus.time = getTimeStampFormated();

    if (finishTraning) {
      hero.adventureStartedTime = 0;
      hero.actionStatus = null;
    } else {
      hero.actionStatus.time = getTimeStampFormated();
    }

    this.updateHero(hero);

    const statushero: PlayStatus = hero.actionStatus;
    statushero.time = time;

    return statushero;
  }
}

export const heroService: HeroService = new HeroService();