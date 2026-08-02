/**
 * Find the LAUNCHER activity node in a parsed AndroidManifest application node.
 * @param {object} applicationNode
 * @returns {object|null}
 */
function findLauncherActivity(applicationNode) {
  const activities = applicationNode.activity || [];
  for (const activity of activities) {
    const filters = activity['intent-filter'] || [];
    for (const filter of filters) {
      const actions = (filter.action || []).map((a) => a.$?.['android:name']);
      const categories = (filter.category || []).map((c) => c.$?.['android:name']);
      if (
        actions.includes('android.intent.action.MAIN') &&
        categories.includes('android.intent.category.LAUNCHER')
      ) {
        return activity;
      }
    }
  }

  return (
    activities.find((a) => {
      const name = a.$?.['android:name'] || '';
      return name === '.MainActivity' || name.endsWith('.MainActivity');
    }) || null
  );
}

module.exports = {
  findLauncherActivity,
};
