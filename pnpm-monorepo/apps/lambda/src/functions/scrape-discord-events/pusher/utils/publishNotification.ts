import { env } from "../../env";
import { beamsClient } from "./beamsClient";

export const publishNotification = async (
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
