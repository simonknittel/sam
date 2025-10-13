import PushNotifications from "@pusher/push-notifications-server";
import { env } from "../../env";

export let beamsClient: PushNotifications | null = null;

if (env.PUSHER_BEAMS_INSTANCE_ID && env.PUSHER_BEAMS_KEY) {
	beamsClient = new PushNotifications({
		instanceId: env.PUSHER_BEAMS_INSTANCE_ID,
		secretKey: env.PUSHER_BEAMS_KEY,
	});
}
