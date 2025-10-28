import { Novu } from "@novu/api";
import { env } from "./env.js";

export const isNovuEnabled = () => Boolean(env.NOVU_SECRET_KEY && env.NOVU_SERVER_URL)

export const novu =
	isNovuEnabled()
		? new Novu({
			secretKey: env.NOVU_SECRET_KEY,
			serverURL: env.NOVU_SERVER_URL,
		})
		: null;
