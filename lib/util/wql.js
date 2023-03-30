/*
Copyright (c) Anthony Beaumont
This source code is licensed under the MIT License
found in the LICENSE file in the root directory of this source tree.
*/

import { Failure } from "@xan105/error";
import { shouldObjLike } from "@xan105/is/assert";
import { 
  isBoolean, 
  isObjLike, 
  isArrayOfStringNotEmpty 
} from "@xan105/is";

function querify(options){
  
  shouldObjLike(options, {
    creation: isBoolean,
    deletion: isBoolean,
    dir: [isObjLike, [{
      filter: isArrayOfStringNotEmpty,
      whitelist: isBoolean
    }]],
    bin: [isObjLike, [{
      filter: isArrayOfStringNotEmpty,
      whitelist: isBoolean
    }]]
  });

  const query = ["SELECT * FROM"];

  if (options.creation && options.deletion){
    query.push("__InstanceOperationEvent"); //Creation + Deletion
  } else if (options.creation && !options.deletion){
    query.push("__InstanceCreationEvent"); //Creation
  } else if (options.deletion && !options.creation){
    query.push("__InstanceDeletionEvent"); //Deletion
  } else {
    throw new Failure("You must subscribe to at least one event", "ERR_INVALID_ARG");
  }

  query.push("WITHIN 1 WHERE TargetInstance ISA 'Win32_Process'");
  
  for (const [i, dir] of options.dir.filter.entries())
  {
    const path = dir.replaceAll("\\","\\\\").replaceAll("/","\\\\");
    !options.dir.whitelist ? query.push("AND NOT") : i === 0 ? query.push("AND (") : query.push("OR");
    query.push(`TargetInstance.ExecutablePath LIKE '%${path}%'`)
    if (options.dir.whitelist && i === options.dir.filter.length - 1) query.push(")"); 
  }

  for (const [i, name ] of options.bin.filter.entries())
  {
    if (options.bin.whitelist){
      i === 0 ? query.push("AND (") : query.push("OR");
      query.push(`TargetInstance.Name = '${name}'`);
      if (i === options.bin.filter.length - 1) query.push(")");
    } else {
      query.push(`AND TargetInstance.Name != '${name}'`);
    }
  }
  
  return query.join(" ");
}

export { querify };