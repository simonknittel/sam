export class CustomError extends Error {
	context: Record<string, unknown>;

	constructor(message: string, context: Record<string, unknown> = {}) {
		super(message);

		this.name = "CustomError";
		this.context = context;
	}
}
