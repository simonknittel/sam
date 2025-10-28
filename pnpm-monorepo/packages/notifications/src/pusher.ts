import PushNotifications from "@pusher/push-notifications-server";
import { env } from "./env.js";

const beamsClient = env.PUSHER_BEAMS_INSTANCE_ID && env.PUSHER_BEAMS_KEY ? new PushNotifications({
	instanceId: env.PUSHER_BEAMS_INSTANCE_ID,
	secretKey: env.PUSHER_BEAMS_KEY,
}) : null;

export const publishPusherNotification = async (
	interests: string[],
	title: string,
	body: string,
	deep_link?: string,
) => {
	if (!beamsClient) return;

	await beamsClient.publishToInterests(interests, {
		web: {
			notification: {
				title: `${title} | S.A.M.`,
				body,
				deep_link: deep_link ? `${env.BASE_URL}${deep_link}` : undefined,
				icon: `${env.BASE_URL}/logo-white-on-black.png`,
			},
		},
	});
};
