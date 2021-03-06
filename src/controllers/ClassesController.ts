import { Request, Response, response } from "express";
import db from "../database/connection";
import convertHourToMinutes from "../../utils/convertHourToMinutes";

export default class ClassesController {
  async index(req: Request, resp: Response) {
    const filter = req.query;

    console.log(filter);

    if (!filter.week_day || !filter.subject || !filter.time) {
      return response
        .status(400)
        .json({ error: "Missing filters to search classes" });
    }

    const timeInMinutes = convertHourToMinutes(filter.time as string);

    const classes = await db("classes")
      .whereExists(function () {
        this.select("class_schedule.*")
          .from("class_schedule")
          .whereRaw("`class_schedule`.`class_id` = `classes`.`id`")
          .whereRaw("`class_schedule`.`week_day` = ??", [
            Number(filter.week_day),
          ])
          .whereRaw("`class_schedule`.`from` <= ??", [timeInMinutes])
          .whereRaw("`class_schedule`.`to` > ??", [timeInMinutes]);
      })
      .where("classes.subject", "=", filter.subject as string)
      .join("users", "classes.user_id", "=", "users.id")
      .select(["classes.*", "users.*"]);

    return resp.status(201).json(classes);
  }
  async create(req: Request, resp: Response) {
    const { name, avatar, whatsapp, bio, subject, cost, schedule } = req.body;

    const trx = await db.transaction();

    try {
      const insertedUserIds = await trx("users").insert({
        name,
        avatar,
        whatsapp,
        bio,
      });
      const user_id = insertedUserIds[0];

      const insertedClassesIds = await trx("classes").insert({
        subject,
        cost,
        user_id,
      });

      const class_id = insertedClassesIds[0];

      const classSchedule = schedule.map((scheduleItem: any) => {
        return {
          class_id,
          week_day: scheduleItem.week_day,
          from: convertHourToMinutes(scheduleItem.from),
          to: convertHourToMinutes(scheduleItem.to),
        };
      });

      await trx("class_schedule").insert(classSchedule);

      await trx.commit();

      return resp.status(201).send();
    } catch (err) {
      await trx.rollback();
      return resp.status(400).json({
        error: "Unexpected error while creating new class",
      });
    }
  }
}
