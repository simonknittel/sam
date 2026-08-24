import { prisma } from "@/db";
import type { Entity, VariantTag } from "@sam-monorepo/database/client";

export const createAndReturnTags = async (
  tagKeys: string[] | undefined,
  tagValues: string[] | undefined,
  authorCitizenId: Entity["id"],
) => {
  let tagsToConnect: VariantTag["id"][] = [];

  const givenTags = tagKeys
    ?.map((key, index) => ({
      key,
      value: tagValues?.[index],
    }))
    .filter((tag) => tag.key && tag.value);

  if (givenTags && givenTags.length > 0) {
    const existingTags = await prisma.variantTag.findMany({
      where: {
        OR: givenTags.map((givenTag) => ({
          key: givenTag.key,
          value: givenTag.value!,
        })),
      },
      select: { id: true, key: true, value: true },
    });

    const nonExistingTags = givenTags.filter(
      (givenTag) =>
        !existingTags.some(
          (existingTag) =>
            existingTag.key === givenTag.key &&
            existingTag.value === givenTag.value!,
        ),
    );

    const createdTags = await prisma.variantTag.createManyAndReturn({
      data: nonExistingTags.map((nonExistingTag) => ({
        key: nonExistingTag.key,
        value: nonExistingTag.value!,
        createdById: authorCitizenId,
      })),
    });

    tagsToConnect = [
      ...existingTags.map((tag) => tag.id),
      ...createdTags.map((tag) => tag.id),
    ];
  }

  return tagsToConnect;
};
