import {
  type PermissionSet,
  type PermissionSetAttribute,
} from "./PermissionSet.js";

export function comparePermissionSets(
  requiredPermissionSet: PermissionSet,
  givenPermissionSets: PermissionSet[],
) {
  const givenPermissionSetsForResource = givenPermissionSets.filter(
    (givenPermissionSet) =>
      givenPermissionSet.resource === requiredPermissionSet.resource,
  );

  // TODO: Checking this early for a negation results in negations for more specific attributes not working (see test)
  if (
    givenPermissionSetsForResource.some(
      (givenPermissionSet) => givenPermissionSet.operation === "negate",
    )
  )
    return false;

  if (
    givenPermissionSetsForResource.some((givenPermissionSet) => {
      if (
        requiredPermissionSet.operation === givenPermissionSet.operation ||
        givenPermissionSet.operation === "manage"
      ) {
        if (requiredPermissionSet.attributes && givenPermissionSet.attributes) {
          const result = hasMatchingAttributes(
            requiredPermissionSet.attributes,
            givenPermissionSet.attributes,
          );
          if (!result) return false;
        } else if (
          !requiredPermissionSet.attributes &&
          givenPermissionSet.attributes
        ) {
          return false;
        } else if (
          requiredPermissionSet.attributes &&
          !givenPermissionSet.attributes
        ) {
          return false;
        }

        return true;
      }

      return false;
    })
  )
    return true;

  return false;
}

function hasMatchingAttributes(
  requiredAttributes: PermissionSetAttribute[],
  givenAttributes: PermissionSetAttribute[],
) {
  for (const requiredAttribute of requiredAttributes) {
    if (requiredAttribute.value === true) {
      const hasMatchingAttribute = givenAttributes.find(
        (givenAttribute) =>
          givenAttribute.key === requiredAttribute.key &&
          givenAttribute.value === "true",
      );

      if (hasMatchingAttribute) continue;

      return false;
    }

    const hasMatchingAttribute = givenAttributes.find(
      (givenAttribute) =>
        givenAttribute.key === requiredAttribute.key &&
        (givenAttribute.value === requiredAttribute.value ||
          givenAttribute.value === "*"),
    );

    if (hasMatchingAttribute) continue;

    return false;
  }

  return true;
}
