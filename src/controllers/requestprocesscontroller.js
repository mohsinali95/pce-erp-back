export function initiatePriorityIndex(priority_array){


    let priority_index = 0;

    for (const [index, element] of priority_array.entries()) {
        if (element.status == true) {
            priority_index += index;
            break;
        }
    }


   return priority_index = priority_index + 1;

}