# BELFORT - the townsfolk kit. Builds a modular set of 1650 Flemish townsfolk on the rider's skeleton
# with headless Blender 4.2 (phase A: bodies, garments, props, atlas, paint, and preview renders).
#
#   tools/blender/fetch_townsfolk_assets.sh [cache-dir]       (once; downloads the CC0 inputs)
#   TOWNSFOLK_CACHE=<cache-dir> TOWNSFOLK_WORK=<work-dir> blender -b --python tools/blender/make_townsfolk.py
#
# Optional environment:
#   TOWNSFOLK_FROM     resume after a stage saved in TOWNSFOLK_WORK (bodies|garments|mesh|paint|assemble)
#   TOWNSFOLK_UNTIL    stop after that stage
#   TOWNSFOLK_PREVIEW  where the preview renders go (default <work>/preview)
#   TOWNSFOLK_SHOTS    comma list of preview shots to render (default all: front,back,faces,sit)
#   TOWNSFOLK_SAMPLES  Cycles samples for the previews (default 48)
#
# See TOWNSFOLK_NOTES.md for what is in the kit, the dye-mask convention and the asset licences.

import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from townsfolk.common import log, save_blend, load_blend   # noqa: E402

STAGES = ['bodies', 'garments', 'mesh', 'paint', 'assemble']


def run_stage(name):
    if name == 'bodies':
        from townsfolk import bodies
        bodies.stage_bodies()
    elif name == 'garments':
        from townsfolk import garments
        garments.stage_garments()
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
    start = STAGES.index(frm) + 1 if frm else 0
    if frm:
        load_blend(frm)
    for name in STAGES[start:]:
        log('=== stage', name)
        run_stage(name)
        save_blend(name)
        if until == name:
            break
    if os.environ.get('TOWNSFOLK_SHOTS', 'all') != 'none' and (not until or until == 'assemble'):
        from townsfolk import preview
        preview.render_all()


if __name__ == '__main__':
    main()
