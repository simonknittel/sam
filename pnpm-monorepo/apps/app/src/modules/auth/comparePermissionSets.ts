import {
  type PermissionSet,
  type PermissionSetAttribute,
} from "./PermissionSet";

export default function comparePermissionSets(
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
      // Check if we have the required operation or manage for this resource
      if (
        requiredPermissionSet.operation === givenPermissionSet.operation ||
        givenPermissionSet.operation === "manage"
      ) {
        // Check if any attributes are required and we have some
        if (requiredPermissionSet.attributes && givenPermissionSet.attributes) {
          const result = hasMatchingAttributes(
            requiredPermissionSet.attributes,
            givenPermissionSet.attributes,
          );
          // Check if the required attributes match the given ones
          if (!result) return false;
        } else if (
          !requiredPermissionSet.attributes &&
          givenPermissionSet.attributes
        ) {
          // When no attributes for this resource and operation are required, but we have some, it means that our given permissions are too specific. Therefore, we should return false.
          return false;
        } else if (
          requiredPermissionSet.attributes &&
          !givenPermissionSet.attributes
        ) {
          // When attributes are required, but we don't have any, we should return false
          return false;
        }

        // If we have the required operation and attributes, we can return true
        return true;
      }

      // If we don't have the required operation, we should return false
      return false;
    })
  )
    // Some of our given permissions match the required ones
    return true;

  // None of our given permissions match the required ones
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
