[< back to home](index.md)

# Game Docs

## What is Signal?

Signal is a game where you build a base, make production lines, and infiltrate other bases for supply.

But, instead of you infiltrating the other bases, you have to program drones and other robots to infiltrate bases.

## Who am I?

You're playing as an AI, the "brain" of your base. You have a small item and money inventory, but you need to deploy chests to store large amounts of stuff. You need to build machines to do things. Machines can have many different attachments to do many different actions. You also need to write firmware for machines in JavaScript.

## How can I infiltrate bases?

We're still thinking about that. Our first thought was you can destroy walls with specific attachments, but we'll look into it more to make it balanced. When you infiltrate bases, you'd ideally want to go for chests deployed in the base.

## What machines can I build?

Here are some examples:
 * machine + 4x motor + 4x wheel - a fast machine that can drive around bases.
 * machine + 2x motor + 4x wheel - a slower machine that can drive around bases.
 * machine + 4x motor + 4x wheel + camera - a fast machine that can drive around bases and recognize buildings (e.g. wall, chest)
 * machine + 4x motor + 4x propeller - a drone that can fly around bases without hitting obstacles.
 * machine + casing - higher-health machine
 * machine + 4x motor + 4x propeller + motion sensor + rf broadcaster - a drone that can fly around bases, sense the movement of intruding machines, and broadcast an rf signal if sensed
 * machine + container - a machine with a chest on it
 * machine + grabber + container - a machine that can pick items out of chests next to it, and then can store them in their own container (a looting bot, one you would use when infiltrating bases)
 * machine + drill + container + grabber - a machine that can mine below it to gather resources

There are tons of possibilites to explore...

## How would I program the machines?

To program the machines, you need to write firmware. Firmware are written in JS.

Firmware are event based. This means that you don't get to run instructions on every gametick, but only when something new happens.

Attaching parts to machines also happens in firmware. For example, if you do `var drill = machine.attach("drill")`, and you deploy the firmware, a drill is automatically used up from your inventory.

Firmware are also marketable and tradeable. When you market/trade a firmware, you're not selling the parts needed for the machine, only the code for the machine.

Example firmware for a dumb base-looting bot (machine + 2x motor + 4x wheel + camera + grabber + container):
```js
// attachments, NOTE: this API will defenitely change, this is a very bad psuedo-code example for attaching things.
machine.require("motor", 2);
machine.require("wheel", 4);
machine.require("camera");
machine.require("grabber");
machine.require("container");

motor.attach("wheel", 2);
machine.attach("motor", 2);
machine.attach("wheel", 2);
machine.attach("camera");
machine.attach("grabber");
machine.attach("container");

machine.arrivedAtBase(function atBaseEvent(user) { // when machine arrives at a base
    if (user == machine.owner) return;

    var chestPos = camera.find("CHEST", { inventory: { $gt: 0 } }); // find chests that aren't empty, NOTE: cameras wont see behind walls, so a smarter bot would break walls to explore more secure chests.
    if (!chestPos) return motor.goHome() // if can't find chest, go home
    motor.moveTo(chestPos); // pathfind to chest
});

machine.nextToBuilding(function atBuildingEvent(building) { // when the machine is next to a building
    if (building.type == "CHEST") {
        while (building.inventory.length != 0 || container.isFull) { // while chest isn't empty/our container isn't full
            grabber.grabAll(building);
            grabber.putAll(container); // NOTE: in the final API, you will have a way of filtering the items that you put in your container (for example, ignore low-tier items, or prioritize higher-tier items over low-tier ones, this obviously manually done by usercode)
        }
    }

    if (container.isFull) return motor.goHome() // if our container is full, go back to homebase

    if (!motor.moving) { // if we've pathfinded to a chest, find another one
        var chestPos = camera.find("CHEST", { inventory: { $gt: 0 } }); // find chests that aren't empty
        if (!chestPos) return motor.goHome(); // if can't find chest, go home
        motor.moveTo(chestPos); // pathfind to chest
    }
});
```

*NOTE: This is VERY psuedocode, and prone to change in the future.*

For every event, functions will have a small (exact length to be decided) time to run.

## What happens if two machines look at each other, have cannons, and shoot in the same tick at each other?

Both bots will receive damage.