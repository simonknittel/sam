import "./env";
import { removeExpiredRoles } from "./removeExpiredRoles";

export const midnightAutomationsHandler = async () => {
	// TODO: Add profit distribution cycle automation here

	await removeExpiredRoles();
};
