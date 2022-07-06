/*
Copyright (c) Anthony Beaumont
This source code is licensed under the MIT License
found in the LICENSE file in the root directory of this source tree.
*/

function querify(options){
  
  let query = ["SELECT * FROM"];

  if (options.creation && !options.deletion){
    query.push("__InstanceCreationEvent"); //Creation
  } else if (options.deletion && !options.creation){
    query.push("__InstanceDeletionEvent"); //Deletion
  } else {
    query.push("__InstanceOperationEvent"); //Creation + Deletion
  }
  
  query.push("WITHIN 1 WHERE TargetInstance ISA 'Win32_Process'");
  
  if (options.dir.filter.length > 0){
    for (const i in options.dir.filter)
    {
      const path = options.dir.filter[i]
                   .replaceAll("\\","\\\\")
                   .replaceAll("/","\\\\");
      
      if (options.dir.whitelist){
        if (i == 0) {
          query.push(`AND ( TargetInstance.ExecutablePath LIKE '%${path}%'`);
        } else {
          query.push(`OR TargetInstance.ExecutablePath LIKE '%${path}%'`);
        }
      } else {
        query.push(`AND NOT TargetInstance.ExecutablePath LIKE '%${path}%'`);
      }
    }
    if (options.dir.whitelist) query.push(")");
  }
  
  if (options.bin.filter.length > 0){
    for (const i in options.bin.filter)
    {
      const name = options.bin.filter[i];
      
      if (options.dir.whitelist){
        if (i == 0) {
          query.push(`AND ( TargetInstance.Name = '${name}'`);
        } else {
          query.push(`OR TargetInstance.Name = '${name}'`);
        }
      } else {
        query.push(`AND NOT TargetInstance.Name != '${name}'`);
      }
    }
    if (options.dir.whitelist) query.push(")");
  }
  
  return query.join(" ");
}

export { querify };