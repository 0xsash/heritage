# BELFORT - the townsfolk kit. Builds a modular set of 1650 Flemish townsfolk on the rider's skeleton
# with headless Blender 4.2: bodies, garments, props, game meshes, atlases, paint, clips, previews, and the export
# to public/models/townsfolk.glb + townsfolk.json.
#
#   tools/blender/fetch_townsfolk_assets.sh [cache-dir]       (once; downloads the CC0 inputs)
#   TOWNSFOLK_CACHE=<cache-dir> TOWNSFOLK_WORK=<work-dir> blender -b --python tools/blender/make_townsfolk.py
#
# Optional environment:
#   TOWNSFOLK_FROM     resume after a stage saved in TOWNSFOLK_WORK (bodies|garments|game|mesh|paint|anim|assemble|export)
#   TOWNSFOLK_UNTIL    stop after that stage
#   TOWNSFOLK_PREVIEW  where the preview renders go (default <work>/preview)
#   TOWNSFOLK_SHOTS    comma list of preview shots to render (default all: front,back,faces,sit)
#   TOWNSFOLK_SAMPLES  Cycles samples for the previews (default 48)
#
# See TOWNSFOLK_NOTES.md for what is in the kit, the dye-mask convention and the asset licences.

import os, sys
sys.dont_write_bytecode = True          # keep the repo free of __pycache__
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from townsfolk.common import log, save_blend, load_blend   # noqa: E402

STAGES = ['bodies', 'garments', 'game', 'mesh', 'paint', 'anim', 'assemble', 'export']


def run_stage(name):
    if name == 'bodies':
        from townsfolk import bodies
        bodies.stage_bodies()
    elif name == 'garments':
        from townsfolk import garments
        garments.stage_garments()
    elif name == 'game':
        from townsfolk import game
        game.stage_game()
    elif name == 'anim':
        from townsfolk import anim
        anim.stage_anim()
    elif name == 'export':
        from townsfolk import export
        export.stage_export()
    elif name == 'mesh':
        from townsfolk import atlas
        atlas.stage_mesh()
    elif name == 'paint':
        from townsfolk import paint
        paint.stage_paint()
    elif name == 'assemble':
        from townsfolk import assemble
        assemble.stage_assemble()


def main():
    frm = os.environ.get('TOWNSFOLK_FROM', '')
    until = os.environ.get('TOWNSFOLK_UNTIL', '')
    shots = os.environ.get('TOWNSFOLK_SHOTS', 'all')
    start = STAGES.index(frm) + 1 if frm else 0
    if frm:
        load_blend(frm)
    for name in STAGES[start:]:
        if name == 'export' and shots != 'none':
            # previews first: the export simplifies the materials in place
            from townsfolk import preview
            preview.render_all()
            load_blend('assemble')
        log('=== stage', name)
        run_stage(name)
        save_blend(name)
        if until == name:
            break
    if frm == 'export' or (frm == 'assemble' and until == 'assemble'):
        if shots != 'none':
            from townsfolk import preview
            preview.render_all()


if __name__ == '__main__':
    main()
