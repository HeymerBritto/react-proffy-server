import { Request, Response, response } from "express";
import db from "../database/connection";

export default class ConnectionsController {
  async index(req: Request, resp: Response) {
    const totalConnection = await db("connections").count("* as total");
    return resp.json({ total: totalConnection[0].total });
  }
  async create(req: Request, resp: Response) {
    const { user_id } = req.body;

    await db("connections").insert({
      user_id,
    });

    return resp.status(201).send();
  }
}
