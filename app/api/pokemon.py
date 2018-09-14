from flask import request, json, Response
from flask_login import login_required, current_user
from sqlalchemy import func

from app import db
from app.api import bp
from app.models import User, Pokemon


def merge_dict_lists(key, l1, l2, append=True):
    merged = {}

    for item in l1:
        if item[key] in merged:
            merged[item[key]].update(item)
        else:
            merged[item[key]] = item

    for item in l1 + l2:
        if item[key] in merged:
            merged[item[key]].update(item)
        elif append:
            merged[item[key]] = item
    return [val for (_, val) in merged.items()]


@bp.route("/<username>/pokemon/get", methods=["GET"])
def fetch_pokemon(username):
    user = User.query.filter(
        func.lower(User.username) == func.lower(username)
    ).first_or_404()

    if user is None or (not user.is_public and current_user.username != user.username):
        r = json.dumps({"success": False})
        return Response(r, status=403, mimetype="application/json")

    pokemon_list = []
    list = request.args.get("list", "default")
    cat = request.args.get("cat", "all")
    gen = request.args.get("gen", "1")
    own = request.args.get("own", "all")
    name = request.args.get("name", None)

    filtered_query = Pokemon.query.filter_by(in_game=True).filter_by(released=True)

    if name is not None:
        filtered_query = filtered_query.filter_by(name=name)

    if gen not in ("all"):
        filtered_query = filtered_query.filter_by(gen=gen)

    if cat not in ("all", "lucky"):
        filtered_query = filtered_query.filter(getattr(Pokemon, cat), True)

    for u in filtered_query.all():
        pokemon_list.append(u.as_dict())

    pokemon = sorted(
        merge_dict_lists(
            "name",
            pokemon_list,
            json.loads(user.pokemon_owned).get(list, []),
            append=False,
        ),
        key=lambda k: (k["dex"], k["img_suffix"]),
    )

    if not own == "all":
        _pokemon_owned = []

        for p in pokemon:
            if cat not in ["shiny", "lucky"]:
                _owned = p.get("owned", False)
            elif cat == "shiny":
                _owned = p.get("shinyowned", False)
            elif cat == "lucky":
                _owned = p.get("luckyowned", False)

            if (own == "owned" and _owned) or (own == "notowned" and not _owned):
                _pokemon_owned.append(p)

        pokemon = _pokemon_owned

    r = json.dumps({"success": True, "pokemon": pokemon})
    return Response(r, status=200, mimetype="application/json")


@bp.route("/<username>/pokemon/update", methods=["PUT"])
@login_required
def update_pokemon(username):
    user = User.query.filter(
        func.lower(User.username) == func.lower(username)
    ).first_or_404()

    if current_user.username == user.username:
        list = request.args.get("list", "default")
        pokemon = json.loads(request.form.get("data"))

        ul = merge_dict_lists(
            "name", json.loads(user.pokemon_owned).get(list, []), [pokemon]
        )

        user.pokemon_owned = json.dumps({list: ul})
        db.session.commit()

        updated_pokemon = pokemon

        for p in json.loads(user.pokemon_owned).get(list, []):
            if p["name"] == pokemon["name"]:
                updated_pokemon = p
                break

        updated_pokemon_list = merge_dict_lists(
            "name",
            [updated_pokemon],
            [Pokemon.query.filter_by(name=pokemon["name"]).first().as_dict()],
        )

        r = json.dumps({"success": True, "updated_pokemon": updated_pokemon_list})
        return Response(r, status=200, mimetype="application/json")
    else:
        r = json.dumps({"success": False})
        return Response(r, status=403, mimetype="application/json")


@bp.route("/pokemon/raidbosses/get", methods=["GET"])
@login_required
def fetch_raid_bosses():
    rb_list = (
        Pokemon.query.filter_by(in_game=True)
        .filter_by(released=True)
        .filter(Pokemon.raid > 0)
        .all()
    )
    raid_bosses = {6: [], 5: [], 4: [], 3: [], 2: [], 1: []}

    for rb in rb_list:
        raid_boss = rb.as_dict()
        raid_boss["battle_cp"] = rb.calc_raid_cp()
        raid_boss["max_cp"] = rb.calc_cp(20)
        raid_boss["max_cp_weather"] = rb.calc_cp(25)
        raid_boss["min_cp"] = rb.calc_cp(20, 10, 10, 10)
        raid_boss["min_cp_weather"] = rb.calc_cp(25, 10, 10, 10)

        raid_bosses[rb.raid].append(raid_boss)

    r = json.dumps({"success": True, "raidbosses": raid_bosses})
    return Response(r, status=200, mimetype="application/json")


@bp.route("/pokemon/egghatches/get", methods=["GET"])
@login_required
def fetch_egg_hatches():
    eh_list = (
        Pokemon.query.filter_by(in_game=True)
        .filter_by(released=True)
        .filter(Pokemon.hatch > 0)
        .all()
    )
    egg_hatches = {10: [], 7: [], 5: [], 2: []}

    for eh in eh_list:
        egg_hatch = eh.as_dict()

        egg_hatches[eh.hatch].append(egg_hatch)

    r = json.dumps({"success": True, "egghatches": egg_hatches})
    return Response(r, status=200, mimetype="application/json")
